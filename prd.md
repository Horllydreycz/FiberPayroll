# Fiber Payroll PRD

> **Tagline:** Global payroll in stablecoins, completed in minutes.

---

# Product Overview

## Problem Statement

Companies increasingly hire remote employees and contractors across multiple countries. Traditional payroll systems are expensive, slow, require multiple banking partners, incur high foreign exchange fees, and often take several days before employees receive their salaries.

Businesses need a modern payroll platform capable of paying international workers instantly using stablecoins while maintaining payroll records, tax exports, settlement tracking, and accounting reports.

Fiber Payroll leverages Fiber's payment infrastructure to enable businesses to upload payroll data, review payment batches, send payments in stablecoins, monitor settlement status, and export payroll reports.

---

# Product Goal

Build an MVP payroll platform that allows companies to:

- Manage employees
- Upload payroll data
- Review payroll before payment
- Approve payroll batches
- Execute batch stablecoin payments
- Monitor settlement status
- Generate payslips
- Export accounting reports

---

# Target Users

## Primary Users

- Remote-first startups
- Tech companies
- Web3 companies
- DAOs
- International agencies
- Consulting firms

## Secondary Users

- Payroll providers
- HR firms
- Accounting firms
- Freelancer agencies

---

# Success Metrics

- Complete payroll in under 5 minutes
- Support 500+ employees per payroll batch
- 100% payment status tracking
- CSV payroll imports
- PDF payslip generation
- Accounting export support

---

# User Stories

## Employer

As an employer, I want to upload payroll using a CSV file so I don't have to manually create hundreds of payments.

As an employer, I want to review payroll before approval so I can avoid costly mistakes.

As an employer, I want to monitor payment settlement so I know every employee has been paid.

As an employer, I want downloadable reports so accounting becomes simple.

## Employee

As an employee, I want to receive payment confirmation and a downloadable payslip after my salary has been processed.

---

# Core Features

## 1. Authentication

### Features

- Sign Up
- Login
- Forgot Password
- Company Profile
- Invite Team Members

### User Roles

- Admin
- Finance Manager
- Viewer

---

# 2. Dashboard

## Summary Cards

- Company Balance
- Employees
- Payroll This Month
- Pending Payroll
- Completed Payroll
- Total Amount Paid
- Settlement Success Rate

## Recent Activity

- Latest Payroll Runs
- Recent Settlements
- Failed Payments
- Notifications

---

# 3. Employee Management

## Employee Information

Each employee should contain:

- Full Name
- Email
- Country
- Job Title
- Wallet Address
- Preferred Stablecoin
- Salary Amount
- Payment Frequency
- Employment Type
- Tax ID
- Status
- Notes

### Features

- Create Employee
- Edit Employee
- Delete Employee
- Search Employees
- Filter Employees
- Pagination

---

# 4. Bulk Employee Import

## CSV Upload

Features:

- Upload CSV
- Validate Data
- Detect Duplicate Employees
- Preview Imported Data
- Import Summary
- Error Handling

---

# 5. Payroll Engine

## Payroll Workflow

```
Create Payroll

↓

Select Employees

↓

Generate Payroll

↓

Review Payroll

↓

Approve Payroll

↓

Execute Payments

↓

Track Settlement
```

## Payroll Batch

Fields

- Batch ID
- Payroll Month
- Created By
- Created Date
- Total Amount
- Status

Statuses

- Draft
- Approved
- Processing
- Completed
- Failed
- Cancelled

---

## Payroll Item

Each employee payment contains:

- Employee
- Salary Amount
- Currency
- Converted Stablecoin Amount
- Stablecoin Type
- Wallet Address
- Status
- Transaction Hash
- Receipt

---

# 6. Fiber Payment Integration

## Features

- Generate Payment Requests
- Batch Payments
- Settlement Tracking
- Retry Failed Payments
- Payment Webhooks

## Payment Status

- Pending
- Broadcasting
- Processing
- Settled
- Failed
- Expired
- Refunded

---

# 7. Settlement Dashboard

## Timeline

```
Payroll Created

↓

Payment Requested

↓

Broadcast

↓

Confirmed

↓

Settled
```

## Dashboard Statistics

- Total Paid
- Pending Payments
- Failed Payments
- Average Settlement Time
- Network Fees
- Success Rate

---

# 8. Payroll History

Features

- Monthly Payroll List
- Search
- Filter
- View Details
- Duplicate Previous Payroll
- Export Records

---

# 9. Payslip Generator

Generate downloadable PDF payslips containing:

- Company Logo
- Employee Information
- Salary Breakdown
- Gross Pay
- Tax
- Net Pay
- Stablecoin Used
- Transaction Hash
- Payment Date
- QR Code Verification

Options

- Download PDF
- Email Payslip

---

# 10. Reports

Generate reports including:

- Monthly Payroll
- Country Breakdown
- Department Spending
- Stablecoin Usage
- Settlement Report
- Tax Report
- Employee Payment History

---

# 11. Accounting

Exports

- CSV
- Excel
- Journal Entries
- Payroll Ledger
- Settlement Ledger
- QuickBooks Format
- Xero Format

---

# 12. Notifications

## Email Notifications

- Payroll Created
- Payroll Approved
- Payment Failed
- Payroll Completed
- Employee Paid

## In-App Notifications

- Success
- Warning
- Error

---

# 13. Audit Log

Track every important action.

Examples

- Login
- Employee Created
- Payroll Generated
- Payroll Approved
- Payment Retried
- Employee Deleted
- Report Exported

---

# 14. Search

Global search for

- Employees
- Payrolls
- Wallet Addresses
- Settlements
- Batch Numbers

---

# 15. Settings

Company Settings

- Company Name
- Logo
- Branding

Payment Settings

- Default Stablecoin
- Default Currency
- Timezone

Developer Settings

- API Keys
- Webhooks

---

# AI Features (Hackathon Bonus)

## AI Payroll Assistant

Examples

- "How much are we paying this month?"
- "Which employees haven't been paid?"
- "Generate a payroll summary."
- "Highlight unusual salary changes."
- "Predict next month's payroll expenses."

---

# Technical Stack

## Frontend

- Next.js 15
- TypeScript
- Tailwind CSS
- Shadcn UI
- React Hook Form
- Zod
- TanStack Query
- Framer Motion

---

## Backend

- Next.js API Routes
- Prisma ORM
- PostgreSQL
- Fiber SDK
- Redis
- BullMQ

---

## Authentication

- Clerk
  or
- Auth.js

---

## Storage

- Supabase Storage
  or
- AWS S3

---

## PDF Generation

- React PDF

---

## CSV Parsing

- PapaParse

---

## Charts

- Recharts

---

# Database Models

- User
- Company
- Employee
- PayrollBatch
- PayrollItem
- Payment
- Settlement
- Wallet
- Payslip
- Notification
- AuditLog

---

# Application Pages

## Public

- Landing Page
- Login
- Register

## Dashboard

- Dashboard
- Employees
- Employee Details
- Payroll
- Create Payroll
- Payroll Review
- Payroll History
- Payroll Details
- Settlements
- Reports
- Notifications
- Settings

---

# UI Style

Inspired by:

- Stripe
- Mercury
- Ramp
- Linear

Design Principles

- Clean
- Professional
- Minimal
- Modern
- Fast
- Responsive
- Light Theme
- Dark Theme

---

# Demo Flow

```
Login

↓

Dashboard

↓

Upload Employee CSV

↓

Preview Import

↓

Import Employees

↓

Create Payroll

↓

Review Payroll

↓

Approve Payroll

↓

Execute Fiber Payments

↓

Watch Live Settlement

↓

Payroll Completed

↓

Generate Payslips

↓

Export Accounting Report
```

---

# Development Roadmap

## Phase 1 — Project Setup

### Tasks

- Create Next.js project
- Configure TypeScript
- Configure Tailwind CSS
- Install Shadcn UI
- Setup ESLint & Prettier
- Configure Authentication
- Configure Prisma
- Setup PostgreSQL
- Create Application Layout
- Create Sidebar
- Create Navigation
- Create Landing Page
- Create Login Page

---

## Phase 2 — Employee Management

### Tasks

- Create Employee Model
- Employee CRUD
- Employee Table
- Search
- Filters
- Pagination
- CSV Upload
- CSV Validation
- Import Preview
- Duplicate Detection

---

## Phase 3 — Payroll

### Tasks

- Payroll Batch Model
- Payroll Generator
- Payroll Review Page
- Payroll Approval
- Payroll Status Management
- Payroll History

---

## Phase 4 — Fiber Integration

### Tasks

- Fiber SDK Integration
- Payment Request Creation
- Batch Payments
- Settlement Tracking
- Transaction History
- Retry Failed Payments
- Webhook Handling

---

## Phase 5 — Reports

### Tasks

- PDF Payslips
- Payroll Reports
- Settlement Reports
- CSV Export
- Excel Export
- Charts
- Accounting Export

---

## Phase 6 — Polish

### Tasks

- Notifications
- Audit Logs
- Animations
- Loading States
- Empty States
- Error Handling
- Responsive Design
- Demo Data
- Performance Optimization

---

# Suggested Folder Structure

```
app/
│
├── (auth)/
│
├── dashboard/
│   ├── employees/
│   ├── payroll/
│   ├── settlements/
│   ├── reports/
│   ├── notifications/
│   └── settings/
│
├── api/
│
├── components/
│   ├── ui/
│   ├── dashboard/
│   ├── employees/
│   ├── payroll/
│   ├── reports/
│   ├── charts/
│   └── shared/
│
├── hooks/
│
├── lib/
│   ├── fiber/
│   ├── prisma/
│   ├── auth/
│   ├── csv/
│   └── utils/
│
├── prisma/
│
├── types/
│
└── public/
```

---

# Future Improvements

- Multi-company support
- Multi-wallet support
- Payroll scheduling
- Multi-language support
- Mobile application
- Employee self-service portal
- Automated tax calculations
- Currency conversion engine
- AI payroll forecasting
- Slack and Microsoft Teams notifications
- ERP integrations
- QuickBooks API integration
- Xero API integration
- SAP integration
- Oracle Finance integration

---

# MVP Scope (Hackathon)

The MVP should focus on the following core flow:

1. Authentication
2. Employee Management
3. CSV Employee Import
4. Payroll Generation
5. Payroll Review
6. Batch Stablecoin Payments via Fiber
7. Settlement Tracking
8. PDF Payslip Generation
9. Payroll History
10. Reports Dashboard

Delivering this end-to-end experience will demonstrate Fiber's payment capabilities while solving a real-world business problem in a polished and compelling way.
