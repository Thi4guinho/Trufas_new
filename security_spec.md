# Security Specification & Threat Model

This document outlines the data invariants, potential attack vectors, and specific security tests for the TruffleTech Firestore database.

## Data Invariants

1. **Ownership Constraint**: A user can only access, create, update, or delete records (`truffles`, `customers`, `sales`, `settings`, `cashflow`, `audit_logs`) where the `ownerId` field matches their authenticated UID.
2. **Profile Lock Constraint**: A regular user profile cannot escalate their own `role` field.
3. **Immutability of Key Fields**: Once created, `ownerId` and `createdAt`/`date` must remain unchanged across updates.
4. **Validation Strictness**: Fields must adhere to proper type and size limits (e.g. string size checks) to prevent "Denial of Wallet" resource exhaustion attacks.

## The "Dirty Dozen" Malicious Payloads (Vulnerability Scenarios)

1. **Shadow Update Attack**: Attempt to write a customer with an extra unrecognized admin privilege key (`isAdmin: true`).
2. **Privilege Escalation**: Attempt to update a user profile to change `role` to `'admin'`.
3. **Identity Spoofing**: Attempt to create a truffle with `ownerId` set to a teammate's user ID instead of the authenticated user's ID.
4. **Negative Value / Price Poisoning**: Registering a truffle with a negative cost or price (e.g. `price: -45.00`).
5. **Stock Underflow Attack**: Setting stock value to negative numbers.
6. **Fake Sales Validation Bypass**: Creating a sale without specifying mandatory fields like `quantity`, `totalPrice`, or setting `totalPrice` to a negative amount.
7. **Bypassing Settings Access**: Reading settings that belong to `ownerId` "another-user-uid" as a regular user.
8. **Cashflow Value Injection**: Logging an expense or income value of 0 or a negative amount.
9. **Tampering with Auditor Trails**: Modifying or deleting audit log files in the `audit_logs` collection.
10. **ID Poisoning Attack**: Trying to inject a 2KB junk character string as the document ID for a customer profile.
11. **Immutability Bypass**: Trying to update a sale doc and changing the `ownerId` field to pivot ownership of the document.
12. **Blanket Query Access**: Requesting all sales data without a query filter matching the user's `ownerId` (should be rejected by the rule evaluation).

## Validation Rules Mapping

We map these invariants directly to the Firestore Rules match blocks and helpers, ensuring the database is secure and self-protecting.
