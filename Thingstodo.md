Admin:
    Families:
        1. Small detail fix: 1 child •2 parents, there needs to be a space between the dot and 2 parents. 
        2. View Files has an error when I click on it the one on the children, it just leads me to an empty page. Even if I change the URL its still giving my blank page.
        3. Create an "Edit mode" button where it lets you start editing the accounts. Such as "Deactivate Accounts" "Delete family", essentially what we have now. The goal of this tab is that if anything happens to the child we have quick access to Childs name, any alergies and emergency contacts. So somehow have the Childs name and details first, and minimized except for the important information. 


    Settings:
        1. Create a settings tab where Admin can change password.   
        2. Add a button setting where it can change the Daily Attendance from Manual Entry to Automatic Time Entry.
        3. Create a setting where you can change the business hours and days for the daycare. 

    Attendance:
        1. Change hours from 24 hour to 12 hour format with AM and PM.
        2. Now that you have the settings, organize it so that it shows business hours, and think of a way to make it easier to see the list daily? We should be able to go back and forth between days. Instead of 11/20/2025 have it in the November 11, 2025 format. A suggestion would be, have arrows that can lead you to previous days attendance, next days attendance etc. Also add a button where it opens up the calendar and they can pick any day. The buttons of the calendar should have colors for when there is an entry. Lets go Green for full attendance, and blue for when there is 1 or more that is absent. On each kid as well, there should be a button opens the calendar or something that shows when they were present. Green for present, red for not present. 
        3. 

    Payments: 
        1. Payments should have the invoices that we created. So if I make an invoice, send it to the parent, it should also show up on the parent payments section. This will make it easy for us to keep track of Open Invoices, and make it easy to close it if they paid manually, like E-transfer.
        2. 
    
    Pay Periods:
        1. Close Period isnt working. It gives me a "Failed to load preview" and backend is returning error: 
            postgres-1  | 2025-11-20 23:04:12.108 UTC [82570] ERROR:  missing FROM-clause entry for table "u" at character 147
            backend-1   | Close preview error: error: missing FROM-clause entry for table "u"              
            postgres-1  | 2025-11-20 23:04:12.108 UTC [82570] STATEMENT:  SELECT id, first_name, last_name, salary_amount
            backend-1   |     at /app/node_modules/pg-pool/index.js:45:11
            postgres-1  |          FROM users  
            postgres-1  |          WHERE is_active = trueejections (node:internal/process/task_queues:95:5)
            backend-1   |     at async /app/src/routes/payPeriods.js:192:28 {                                                                                                                                                            
            postgres-1  |            AND payment_type = 'SALARY'
            backend-1   |   length: 113,
            postgres-1  |            AND u.pay_frequency = 'BI_WEEKLY'
            backend-1   |   severity: 'ERROR',
            backend-1   |   code: '42P01',
            backend-1   |   detail: undefined,
            backend-1   |   hint: undefined,
            backend-1   |   position: '147',
            backend-1   |   internalPosition: undefined,
            backend-1   |   internalQuery: undefined,
            backend-1   |   where: undefined,
            backend-1   |   schema: undefined,
            backend-1   |   table: undefined,
            backend-1   |   column: undefined,
            backend-1   |   dataType: undefined,
            backend-1   |   constraint: undefined,
            backend-1   |   file: 'parse_relation.c',
            backend-1   |   line: '3617',
            backend-1   |   routine: 'errorMissingRTE'            
            backend-1   | }           

        2. Pay Period that is closer to the current date needs to be on the top. Can you think of a way to organize this more? Not sure how industry standard would be. 


Educator
    My Schedule:
    1. Sick Days and Vacation Days should be turned into how many hours
    