# Security Policy - BizLedger

## Overview
BizLedger is designed with financial compliance, strict tenant data isolation, and robust Attribute-Based Access Control (ABAC) in Google Cloud Firestore.

## Supported Versions

| Version | Supported          | Status |
| ------- | ------------------ | ------ |
| 1.0.x   | :white_check_mark: | Active production release |

## Architecture & Data Protection
- **Multi-Tenant Isolation**: Business entities, invoices, receipts, customers, and bank accounts are guarded by strict Firestore Security Rules. Cross-tenant access is forbidden.
- **Role-Based Access Control (RBAC)**: Supports `owner`, `admin`, `accountant`, and `viewer` tiers.
- **Account Owner Governance**: Super Administrator governance restricted to designated platform owner (`mode.bproduction@gmail.com`).
- **Precision Financial Accounting**: Strict minor units (100 Kobo = ₦1) preventing floating-point calculation errors.

## Reporting a Vulnerability

If you discover a security vulnerability or logic leak in BizLedger:
1. Please email **mode.bproduction@gmail.com** with details of the vulnerability, reproduction steps, and potential impact.
2. Please do not report security vulnerabilities through public GitHub issues.
3. You will receive an acknowledgment within 24-48 hours. Valid reports will be prioritized and resolved promptly.

