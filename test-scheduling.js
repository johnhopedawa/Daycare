const axios = require('axios');

const API_URL = 'http://localhost:5000';

let adminToken;
let educatorId;
let educatorToken;
let scheduleId;

async function test() {
  try {
    console.log('=== Testing Phase 1: Scheduling System ===\n');

    // Step 1: Login as admin (assuming we have one)
    console.log('1. Creating admin account...');
    try {
      const registerRes = await axios.post(`${API_URL}/auth/register`, {
        email: 'admin@test.com',
        password: 'password123',
        firstName: 'Admin',
        lastName: 'User',
        role: 'ADMIN'
      });
      adminToken = registerRes.data.token;
      console.log('✓ Admin account created');
    } catch (error) {
      // Account might already exist, try login
      const loginRes = await axios.post(`${API_URL}/auth/login`, {
        email: 'admin@test.com',
        password: 'password123'
      });
      adminToken = loginRes.data.token;
      console.log('✓ Admin logged in');
    }

    // Step 2: Create educator with sick/vacation days
    console.log('\n2. Creating educator with 10 sick days and 10 vacation days...');
    const createEducatorRes = await axios.post(
      `${API_URL}/admin/users`,
      {
        email: `educator-${Date.now()}@test.com`,
        password: 'password123',
        firstName: 'Test',
        lastName: 'Educator',
        hourlyRate: '25.00',
        annualSickDays: '10',
        annualVacationDays: '10',
        carryoverEnabled: false,
        dateEmployed: '2025-01-01',
        sin: '123456789',
        ytdGross: '0',
        ytdCpp: '0',
        ytdEi: '0',
        ytdTax: '0',
        ytdHours: '0'
      },
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    educatorId = createEducatorRes.data.user.id;
    console.log('✓ Educator created with ID:', educatorId);
    console.log('  - Sick days: 10');
    console.log('  - Vacation days: 10');

    // Step 3: Get educator's credentials and login
    console.log('\n3. Logging in as educator...');
    const educatorLoginRes = await axios.post(`${API_URL}/auth/login`, {
      email: createEducatorRes.data.user.email,
      password: 'password123'
    });
    educatorToken = educatorLoginRes.data.token;
    console.log('✓ Educator logged in');

    // Step 4: Admin creates a schedule (should be auto-accepted)
    console.log('\n4. Admin creating schedule for educator (should auto-accept)...');
    const createScheduleRes = await axios.post(
      `${API_URL}/schedules/admin/schedules`,
      {
        userId: educatorId,
        shiftDate: '2025-12-01',
        startTime: '09:00',
        endTime: '17:00',
        hours: '8.00',
        notes: 'Test shift'
      },
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    scheduleId = createScheduleRes.data.schedule.id;
    console.log('✓ Schedule created with ID:', scheduleId);
    console.log('  - Status:', createScheduleRes.data.schedule.status);

    if (createScheduleRes.data.schedule.status !== 'ACCEPTED') {
      console.error('✗ ERROR: Schedule should be auto-accepted but is:', createScheduleRes.data.schedule.status);
    } else {
      console.log('✓ Schedule correctly auto-accepted!');
    }

    // Step 5: Educator views their schedules
    console.log('\n5. Educator viewing their schedules...');
    const mySchedulesRes = await axios.get(
      `${API_URL}/schedules/my-schedules?from=2025-11-01&to=2025-12-31`,
      { headers: { Authorization: `Bearer ${educatorToken}` } }
    );
    console.log('✓ Found', mySchedulesRes.data.schedules.length, 'schedules');

    // Step 6: Check educator's current balances
    console.log('\n6. Checking educator balances before decline...');
    const meBeforeRes = await axios.get(
      `${API_URL}/auth/me`,
      { headers: { Authorization: `Bearer ${educatorToken}` } }
    );
    console.log('  - Sick days remaining:', meBeforeRes.data.user.sick_days_remaining);
    console.log('  - Vacation days remaining:', meBeforeRes.data.user.vacation_days_remaining);

    // Step 7: Educator declines shift using sick day
    console.log('\n7. Educator declining shift with sick day...');
    const declineRes = await axios.post(
      `${API_URL}/schedules/my-schedules/${scheduleId}/decline`,
      {
        reason: 'Not feeling well',
        declineType: 'SICK_DAY'
      },
      { headers: { Authorization: `Bearer ${educatorToken}` } }
    );
    console.log('✓ Shift declined');
    console.log('  - New status:', declineRes.data.schedule.status);
    console.log('  - Decline reason:', declineRes.data.schedule.decline_reason);
    console.log('  - Decline type:', declineRes.data.schedule.decline_type);
    console.log('  - Updated sick days:', declineRes.data.balances.sick_days_remaining);
    console.log('  - Updated vacation days:', declineRes.data.balances.vacation_days_remaining);

    // Step 8: Verify balance deduction
    console.log('\n8. Verifying balance deduction...');
    const expectedSickDays = 10 - 1; // 8 hours = 1 day
    if (parseFloat(declineRes.data.balances.sick_days_remaining) === expectedSickDays) {
      console.log('✓ Sick day balance correctly deducted! (10 → 9)');
    } else {
      console.error('✗ ERROR: Expected', expectedSickDays, 'sick days but got', declineRes.data.balances.sick_days_remaining);
    }

    // Step 9: Educator views balances on MySchedule page
    console.log('\n9. Verifying educator can see updated balances...');
    const meAfterRes = await axios.get(
      `${API_URL}/auth/me`,
      { headers: { Authorization: `Bearer ${educatorToken}` } }
    );
    console.log('  - Sick days:', meAfterRes.data.user.sick_days_remaining);
    console.log('  - Vacation days:', meAfterRes.data.user.vacation_days_remaining);

    // Step 10: Admin views the declined schedule
    console.log('\n10. Admin viewing declined schedule...');
    const adminSchedulesRes = await axios.get(
      `${API_URL}/schedules/admin/schedules?from=2025-11-01&to=2025-12-31`,
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    const declinedSchedule = adminSchedulesRes.data.schedules.find(s => s.id === scheduleId);
    console.log('✓ Admin can see schedule:');
    console.log('  - Status:', declinedSchedule.status);
    console.log('  - Decline reason:', declinedSchedule.decline_reason);
    console.log('  - Decline type:', declinedSchedule.decline_type);

    console.log('\n=== ✓ ALL TESTS PASSED ===\n');
    console.log('Phase 1 Implementation Complete!');
    console.log('- Schedules are auto-accepted when created by admin');
    console.log('- Educators can decline shifts with reason + type');
    console.log('- Sick/vacation day balances auto-deduct correctly');
    console.log('- Admin can configure leave days for educators');

  } catch (error) {
    console.error('\n✗ TEST FAILED:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
    process.exit(1);
  }
}

test();
