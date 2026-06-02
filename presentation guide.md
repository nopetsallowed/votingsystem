# Online Voting System Presentation Guide

## 1. Opening Introduction

Good day everyone. Today I will present our web application called **Online Voting System**.

This application is designed to make elections easier to manage, more accessible for voters, and more transparent when viewing results. It provides separate experiences for voters and administrators, so each user only sees the tools that match their role.

The system uses a **React frontend**, a **Java Spring Boot backend**, and **MySQL** for storing application data.

## 2. Main Problem

Traditional voting can be time-consuming because voters need to be physically present, administrators must manually manage voter records, and results can take time to organize.

Our application helps solve this by providing:

- Online voter registration
- Secure sign-in
- Admin-controlled voter approval
- Election, party, position, and candidate management
- A voting booth for approved voters
- Public results for closed elections
- Audit logs for administrative actions

## 3. Key Users

There are three main user roles in the application:

- **Super Admin**: Has the highest level of access and can manage the system.
- **Election Admin**: Manages elections, voters, parties, positions, candidates, and results.
- **Voter**: Registers, waits for approval, signs in, and votes in active elections.

Demo accounts:

| Role | Username | Password |
| --- | --- | --- |
| Super Admin | `superadmin` | `admin123` |
| Election Admin | `electionadmin` | `admin123` |
| Sample Voter | `alice_voter` | `voter123` |

## 4. Suggested Presentation Flow

### Step 1: Show the Landing Page

Start on the homepage and explain:

- The system is branded as **VoteSystem**.
- Users can sign in or register from the landing page.
- Public users can view election schedules.
- Closed elections can show public results.

Suggested line:

"This is the landing page. It introduces the system and gives users access to voter registration, login, election schedules, and closed election results."

### Step 2: Show Registration

Click **Register** and explain:

- New voters can create an account.
- The system collects full name, username, email, password, phone number, address, and optional profile photo.
- A voter ID is generated automatically after registration.
- New voters must wait for administrator verification before voting.

Suggested line:

"Registration is not enough to vote immediately. The account must first be reviewed and approved by an administrator, which helps prevent unauthorized voting."

### Step 3: Show Login and Demo Accounts

Go to **Sign In** and show the quick demo account buttons.

Explain:

- Different roles are routed to different dashboards.
- A voter sees the voter station.
- An admin sees the admin portal.

Suggested line:

"The login page supports role-based access. This means each user sees only the functions that are appropriate for their role."

### Step 4: Present the Admin Portal

Log in as `electionadmin` or `superadmin`.

Show these tabs or sections:

- **Metrics**: Total voters, candidates, parties, active elections, votes, and pending voters.
- **Voters**: Admin can approve, suspend, or delete voter accounts.
- **Elections**: Admin can create, edit, activate, close, or delete elections.
- **Parties**: Admin can add political parties with logos, colors, slogans, leaders, and descriptions.
- **Candidates**: Admin can add candidates, assign them to positions and parties, upload photos, and add platform details.
- **Audit Logs**: Admin can review system activity.

Suggested line:

"The admin portal is the control center of the application. From here, election officers can prepare the election data, verify voters, open elections, and close elections when voting is finished."

### Step 5: Explain Election Setup

Describe the election setup order:

1. Create parties.
2. Create positions.
3. Add candidates.
4. Create an election.
5. Select participating parties.
6. Map contested positions.
7. Activate the election.
8. Close the election when finished.

Suggested line:

"The election setup follows a logical workflow. We first prepare parties, positions, and candidates, then combine them into an election before activating it for voters."

### Step 6: Show the Voter Dashboard

Log in as `alice_voter`.

Explain:

- The voter sees their voter card and approval status.
- Active elections appear in the dashboard.
- Voting history is shown as a verification ledger.
- If the voter is not approved, the system blocks them from casting votes.

Suggested line:

"The voter dashboard focuses only on the voter's personal voting activity. It shows active elections, voting status, and previous ballot records."

### Step 7: Demonstrate Voting

Open an active election and show the voting booth.

Explain:

- The voter sees the election details.
- Positions are displayed as ballot sections.
- Candidates are shown with party details, photos, and platform statements.
- The voter selects a candidate and confirms the ballot.
- After confirming, the vote is locked and cannot be changed.

Suggested line:

"Before a vote is submitted, the system asks for confirmation. This is important because once a ballot is submitted, it becomes permanent."

### Step 8: Show Results

After an election is closed, open the results page.

Explain:

- Results are available for closed elections.
- The page shows total votes, registered voters, turnout, and participation.
- Charts visualize voting results.
- A detailed tally lists candidates per position.
- The report can be printed.

Suggested line:

"Once an election is closed, the system generates a results report with vote totals, turnout, charts, and a certified tally list."

## 5. Important Features to Highlight

- **Role-based access**: Admins and voters have different permissions.
- **Voter approval system**: New voters need administrator approval before voting.
- **Election lifecycle**: Elections can be scheduled, activated, and closed.
- **Candidate and party management**: Admins can organize complete election data.
- **One vote per position**: Voters cannot repeatedly vote for the same position.
- **Voting history**: Voters can see their recorded ballot activity.
- **Results dashboard**: Closed elections show organized and printable results.
- **Audit logs**: Admin actions are tracked for accountability.
- **MySQL persistence**: Data is stored in database tables instead of temporary frontend storage.

## 6. Technical Explanation

Frontend:

- Built using **React** and **TypeScript**
- Uses reusable components such as navigation, authentication pages, dashboards, and result views
- Uses icons and responsive layouts for a clean interface

Backend:

- Built using **Java Spring Boot**
- Provides API routes for authentication, admin management, voting, results, and profile updates

Database:

- Uses **MySQL**
- Stores users, voters, parties, positions, candidates, elections, election mappings, votes, and audit logs

Suggested line:

"The frontend handles the user interface, the backend processes requests and rules, and MySQL stores the actual election data."

## 7. Short Demo Script

You can follow this order during your live presentation:

1. Open the homepage.
2. Explain the purpose of the Online Voting System.
3. Open the registration form.
4. Explain that voters must be approved.
5. Log in as admin.
6. Show the admin dashboard and management tabs.
7. Show how an election is created or managed.
8. Log out and log in as voter.
9. Show the voter dashboard.
10. Enter the voting booth.
11. Select a candidate and explain confirmation.
12. Show voting history.
13. Return to closed elections or results.
14. Explain charts and printable report.
15. End with the benefits and possible improvements.

## 8. Closing Statement

To conclude, our Online Voting System provides a complete digital workflow for elections. It supports voter registration, admin verification, election setup, secure ballot submission, and transparent results reporting.

This makes the voting process more convenient for voters and more organized for election administrators.

## 9. Possible Questions and Answers

**Question: Can anyone vote after registering?**

No. A registered voter must be approved by an administrator before they can cast a vote.

**Question: Can a voter vote more than once?**

The system is designed to prevent repeated voting for the same position in an election.

**Question: Who can create elections?**

Only admin users can create, activate, close, edit, or delete elections.

**Question: Where is the data stored?**

The data is stored in MySQL tables through the Java Spring Boot backend.

**Question: Can results be viewed anytime?**

Results are intended to be viewed after an election is closed.

**Question: What can be improved in the future?**

Future improvements could include email verification, stronger encryption, two-factor authentication, real-time result updates, accessibility testing, and deployment to a public server.

## 10. Final Tips for Presenting

- Speak slowly and clearly.
- Start with the problem before showing features.
- Use the demo accounts to save time.
- Do not click too fast during the live demo.
- Explain what each role can and cannot do.
- End by summarizing why the system is useful.
- If something does not load, explain the feature using the guide and continue calmly.
