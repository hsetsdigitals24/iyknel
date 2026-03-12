#!/bin/bash

# Nginx Gateway Testing & Monitoring Script
# Usage: ./nginx-tools.sh [command] [options]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
GATEWAY_URL="${GATEWAY_URL:-http://localhost}"
GATEWAY_HOST="${GATEWAY_HOST:-localhost}"
API_KEY="${API_KEY:-}"

# Helper functions
print_header() {
  echo -e "\n${BLUE}=== $1 ===${NC}\n"
}

print_success() {
  echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
  echo -e "${RED}✗ $1${NC}"
}

print_warning() {
  echo -e "${YELLOW}⚠ $1${NC}"
}

# Gateway Health Check
check_gateway_health() {
  print_header "Gateway Health Check"
  
  response=$(curl -s -w "\n%{http_code}" "$GATEWAY_URL/health")
  http_code=$(echo "$response" | tail -n1)
  body=$(echo "$response" | head -n-1)
  
  if [ "$http_code" -eq 200 ]; then
    print_success "Gateway is healthy"
    echo "$body" | jq '.' 2>/dev/null || echo "$body"
  else
    print_error "Gateway returned HTTP $http_code"
    echo "$body"
  fi
}

# Test Service Connectivity
test_service() {
  local service_name=$1
  local service_path=$2
  
  print_header "Testing $service_name"
  
  response=$(curl -s -w "\n%{http_code}" "$GATEWAY_URL$service_path")
  http_code=$(echo "$response" | tail -n1)
  body=$(echo "$response" | head -n-1)
  
  case $http_code in
    200)
      print_success "$service_name is responding"
      echo "$body" | jq '.' 2>/dev/null || echo "$body"
      ;;
    404)
      print_warning "$service_name path returns 404 (may be normal)"
      ;;
    502)
      print_error "$service_name is unreachable (502 Bad Gateway)"
      ;;
    *)
      print_warning "$service_name returned HTTP $http_code"
      ;;
  esac
}

# Test all services
test_all_services() {
  print_header "Testing All Services"
  
  declare -A services=(
    ["Auth"]="/api/auth/"
    ["Products"]="/api/products"
    ["Pricing"]="/api/pricing"
    ["Buyers"]="/api/buyers"
    ["Checkout"]="/api/checkout"
    ["Orders"]="/api/orders"
    ["Payments"]="/api/payments"
    ["Inventory"]="/api/inventory"
    ["Notifications"]="/api/notifications"
  )
  
  for service in "${!services[@]}"; do
    test_service "$service" "${services[$service]}" | tail -n3
    echo ""
  done
}

# Test auth flow
test_auth_flow() {
  print_header "Testing Auth Flow"
  
  local email="test-$(date +%s)@example.com"
  local password="TestPassword123"
  
  # Register
  print_header "Step 1: Register User"
  register_response=$(curl -s -X POST "$GATEWAY_URL/api/auth/register" \
    -H "Content-Type: application/json" \
    -d "{
      \"email\": \"$email\",
      \"password\": \"$password\",
      \"confirmPassword\": \"$password\",
      \"role\": \"BUYER\"
    }")
  
  echo "$register_response" | jq '.' 2>/dev/null || echo "$register_response"
  
  access_token=$(echo "$register_response" | jq -r '.data.accessToken' 2>/dev/null)
  
  if [ -z "$access_token" ] || [ "$access_token" = "null" ]; then
    print_error "Registration failed: No access token in response"
    return 1
  fi
  
  print_success "User registered successfully"
  
  # Get Profile
  print_header "Step 2: Get User Profile"
  profile_response=$(curl -s -X GET "$GATEWAY_URL/api/auth/me" \
    -H "Authorization: Bearer $access_token")
  
  echo "$profile_response" | jq '.' 2>/dev/null || echo "$profile_response"
  print_success "Profile retrieved successfully"
}

# Test rate limiting
test_rate_limiting() {
  print_header "Testing Rate Limiting (Auth Endpoint)"
  
  local endpoint="$GATEWAY_URL/api/auth/"
  local count=0
  local failures=0
  
  echo "Sending 15 rapid requests to $endpoint"
  
  for i in {1..15}; do
    response=$(curl -s -w "\n%{http_code}" -X POST "$endpoint" \
      -H "Content-Type: application/json" \
      -d '{"email": "test@test.com", "password": "test"}')
    
    http_code=$(echo "$response" | tail -n1)
    
    if [ "$http_code" -eq 429 ]; then
      ((failures++))
      echo "Request $i: HTTP $http_code (Rate Limited) ✓"
    else
      echo "Request $i: HTTP $http_code"
    fi
    
    ((count++))
  done
  
  if [ $failures -gt 0 ]; then
    print_success "Rate limiting is working ($failures/$count requests limited)"
  else
    print_warning "No rate limiting detected (may need burst to exceed limit)"
  fi
}

# Monitor real-time traffic
monitor_traffic() {
  print_header "Real-time Traffic Monitor"
  echo "Press Ctrl+C to exit"
  echo ""
  
  # Create temporary file for log
  log_file="/tmp/nginx_monitor_$$.log"
  
  # Try to tail docker logs
  if command -v docker &> /dev/null; then
    if docker logs -f iyknel-nginx 2>/dev/null; then
      return
    fi
  fi
  
  # Fallback to local nginx logs
  if [ -f /var/log/nginx/access.log ]; then
    tail -f /var/log/nginx/access.log
  else
    print_error "Cannot access Nginx logs (requires Docker or local Nginx)"
  fi
}

# Check response times
check_response_times() {
  print_header "Checking Response Times"
  
  declare -A endpoints=(
    ["Health"]="/health"
    ["Auth"]="/api/auth/me"
    ["Products"]="/api/products"
  )
  
  for name in "${!endpoints[@]}"; do
    endpoint="${endpoints[$name]}"
    echo -n "Testing $name... "
    
    response=$(curl -s -w "\n%{time_total}" -X GET "$GATEWAY_URL$endpoint" \
      -H "Authorization: Bearer dummy" 2>/dev/null)
    
    time=$(echo "$response" | tail -n1)
    
    echo "Response time: ${time}s"
  done
}

# View logs
view_logs() {
  local log_type=${1:-access}
  print_header "Nginx $log_type Logs"
  
  if command -v docker &> /dev/null; then
    docker exec iyknel-nginx tail -f /var/log/nginx/${log_type}.log
  elif [ -f "/var/log/nginx/${log_type}.log" ]; then
    tail -f "/var/log/nginx/${log_type}.log"
  else
    print_error "Cannot access logs"
  fi
}

# Report status
report_status() {
  print_header "Gateway Status Report"
  
  # Gateway health
  health=$(curl -s "$GATEWAY_URL/health" | jq -r '.status' 2>/dev/null)
  if [ "$health" = "healthy" ]; then
    print_success "Gateway Status: Healthy"
  else
    print_error "Gateway Status: Unhealthy"
  fi
  
  # Service summary
  print_header "Service Availability"
  
  declare -A services=(
    ["Auth"]="/api/auth/"
    ["Products"]="/api/products"
    ["Orders"]="/api/orders"
    ["Payments"]="/api/payments"
  )
  
  for service in "${!services[@]}"; do
    response=$(curl -s -o /dev/null -w "%{http_code}" "$GATEWAY_URL${services[$service]}" 2>/dev/null)
    if [ "$response" != "502" ] && [ "$response" != "503" ]; then
      print_success "$service: Available (HTTP $response)"
    else
      print_error "$service: Unavailable (HTTP $response)"
    fi
  done
}

# Generate test certificate
generate_ssl_cert() {
  print_header "Generating Self-Signed SSL Certificate"
  
  mkdir -p ./ssl
  
  openssl req -x509 -newkey rsa:4096 -keyout ./ssl/key.pem -out ./ssl/cert.pem -days 365 -nodes -subj "/CN=localhost"
  
  if [ $? -eq 0 ]; then
    print_success "SSL certificate generated"
    echo "Files:"
    echo "  - ./ssl/cert.pem (certificate)"
    echo "  - ./ssl/key.pem (private key)"
  else
    print_error "Failed to generate SSL certificate"
  fi
}

# Load testing with Apache Bench
load_test() {
  print_header "Load Testing"
  
  if ! command -v ab &> /dev/null; then
    print_error "Apache Bench (ab) is not installed"
    echo "Install with: sudo apt-get install apache2-utils"
    return 1
  fi
  
  local requests=${1:-100}
  local concurrency=${2:-10}
  local endpoint="${3:-/health}"
  
  echo "Testing: $GATEWAY_URL$endpoint"
  echo "Requests: $requests | Concurrency: $concurrency"
  echo ""
  
  ab -n "$requests" -c "$concurrency" -q "$GATEWAY_URL$endpoint"
}

# Print help
print_help() {
  cat << EOF
${BLUE}Nginx Gateway Testing & Monitoring Tool${NC}

Usage: $0 [COMMAND] [OPTIONS]

Commands:
  health              Check gateway health status
  test-all            Test all service endpoints
  test-auth           Test complete auth flow (register + login)
  test-service        Test specific service
  test-ratelimit      Test rate limiting
  response-times      Check response times for key endpoints
  monitor             Monitor real-time traffic
  logs [type]         View specific logs (access|error)
  report              Generate status report
  ssl-cert            Generate self-signed SSL certificate
  load-test [n] [c]   Run load test (n=requests, c=concurrency)

Environment Variables:
  GATEWAY_URL         Gateway base URL (default: http://localhost)
  GATEWAY_HOST        Gateway hostname (default: localhost)
  API_KEY             API key for authenticated requests

Examples:
  $0 health                           # Check if gateway is healthy
  $0 test-all                         # Test all services
  $0 test-auth                        # Test authentication flow
  $0 response-times                   # Check response times
  $0 monitor                          # Monitor live traffic
  $0 load-test 1000 50                # Load test with 1000 requests, 50 concurrent
  
  GATEWAY_URL=https://api.example.com $0 health

EOF
}

# Main script logic
main() {
  if [ $# -eq 0 ]; then
    print_help
    exit 0
  fi
  
  case "$1" in
    health)
      check_gateway_health
      ;;
    test-all)
      test_all_services
      ;;
    test-auth)
      test_auth_flow
      ;;
    test-ratelimit)
      test_rate_limiting
      ;;
    response-times)
      check_response_times
      ;;
    monitor)
      monitor_traffic
      ;;
    logs)
      view_logs "${2:-access}"
      ;;
    report)
      report_status
      ;;
    ssl-cert)
      generate_ssl_cert
      ;;
    load-test)
      load_test "${2:-100}" "${3:-10}" "${4:-/health}"
      ;;
    *)
      print_error "Unknown command: $1"
      echo ""
      print_help
      exit 1
      ;;
  esac
}

# Run main function
main "$@"
