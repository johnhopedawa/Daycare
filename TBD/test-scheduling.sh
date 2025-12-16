#!/bin/bash

API_URL="http://localhost:5000"

echo "=== Testing Phase 1: Scheduling System ==="
echo ""

# Step 1: Create/Login as admin
echo "1. Creating admin account..."
ADMIN_RESPONSE=$(curl -s -X POST "$API_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"password123","firstName":"Admin","lastName":"User","role":"ADMIN"}' 2>/dev/null)

if [ $? -ne 0 ] || [ -z "$ADMIN_RESPONSE" ]; then
  # Try login instead
  ADMIN_RESPONSE=$(curl -s -X POST "$API_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"email":"admin@test.com","password":"password123"}')
fi

ADMIN_TOKEN=$(echo $ADMIN_RESPONSE | grep -oP '"token":"[^"]*' | cut -d'"' -f4)
echo "✓ Admin token obtained"
echo ""

# Step 2: Create educator with leave days
echo "2. Creating educator with sick/vacation days..."
TIMESTAMP=$(date +%s)
EDUCATOR_EMAIL="educator-${TIMESTAMP}@test.com"
EDUCATOR_RESPONSE=$(curl -s -X POST "$API_URL/admin/users" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d "{\"email\":\"$EDUCATOR_EMAIL\",\"password\":\"password123\",\"firstName\":\"Test\",\"lastName\":\"Educator\",\"hourlyRate\":\"25.00\",\"annualSickDays\":\"10\",\"annualVacationDays\":\"10\",\"carryoverEnabled\":false,\"dateEmployed\":\"2025-01-01\",\"sin\":\"123456789\",\"ytdGross\":\"0\",\"ytdCpp\":\"0\",\"ytdEi\":\"0\",\"ytdTax\":\"0\",\"ytdHours\":\"0\"}")

echo "$EDUCATOR_RESPONSE"
EDUCATOR_ID=$(echo $EDUCATOR_RESPONSE | grep -oP '"id":[0-9]+' | head -1 | cut -d':' -f2)
echo "✓ Educator created with ID: $EDUCATOR_ID"
echo ""

# Step 3: Login as educator
echo "3. Logging in as educator..."
EDUCATOR_LOGIN=$(curl -s -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EDUCATOR_EMAIL\",\"password\":\"password123\"}")
EDUCATOR_TOKEN=$(echo $EDUCATOR_LOGIN | grep -oP '"token":"[^"]*' | cut -d'"' -f4)
echo "✓ Educator logged in"
echo ""

# Step 4: Create schedule (should auto-accept)
echo "4. Creating schedule (should auto-accept)..."
SCHEDULE_RESPONSE=$(curl -s -X POST "$API_URL/schedules/admin/schedules" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d "{\"userId\":$EDUCATOR_ID,\"shiftDate\":\"2025-12-01\",\"startTime\":\"09:00\",\"endTime\":\"17:00\",\"hours\":\"8.00\",\"notes\":\"Test shift\"}")

echo "$SCHEDULE_RESPONSE"
SCHEDULE_ID=$(echo $SCHEDULE_RESPONSE | grep -oP '"id":[0-9]+' | head -1 | cut -d':' -f2)
SCHEDULE_STATUS=$(echo $SCHEDULE_RESPONSE | grep -oP '"status":"[^"]*' | cut -d'"' -f4)
echo "✓ Schedule created with ID: $SCHEDULE_ID"
echo "  Status: $SCHEDULE_STATUS"
echo ""

# Step 5: Check balances before decline
echo "5. Checking balances before decline..."
ME_BEFORE=$(curl -s -X GET "$API_URL/auth/me" \
  -H "Authorization: Bearer $EDUCATOR_TOKEN")
echo "$ME_BEFORE" | grep -oP '"sick_days_remaining":[0-9.]+|"vacation_days_remaining":[0-9.]+'
echo ""

# Step 6: Decline with sick day
echo "6. Declining shift with sick day..."
DECLINE_RESPONSE=$(curl -s -X POST "$API_URL/schedules/my-schedules/$SCHEDULE_ID/decline" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $EDUCATOR_TOKEN" \
  -d '{"reason":"Not feeling well","declineType":"SICK_DAY"}')

echo "$DECLINE_RESPONSE"
echo ""

echo "=== Test Complete ==="
echo "Check the responses above to verify:"
echo "- Schedule status was ACCEPTED"
echo "- Sick days deducted from 10 to 9"
echo "- Decline reason and type saved"
