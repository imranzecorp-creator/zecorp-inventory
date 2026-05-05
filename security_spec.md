# Firestore Security Specification - Master Inventory AI

## Data Invariants
1. **Inventory Consistency**: No item can exist without a `currentQuantity`.
2. **Transaction Integrity**: Every stock movement must be linked to an existing `itemId` and an authorized `userId`.
3. **Approval Lifecycle**: Only users approved by an admin can modify inventory or view detailed project logs.
4. **Identity Binding**: Users can only create profiles that match their own `auth.uid`.
5. **Role Locking**: Only admins can change a user's `role` or `isApproved` status.

## The "Dirty Dozen" Payloads (Security Test Cases)
The following payloads should be REJECTED by Firestore Security Rules:

1. **Identity Spoofing**: Creating a profile for `other_uid`.
2. **Privilege Escalation**: A standard user attempting to set their own `role` to 'admin'.
3. **Self-Approval**: A standard user attempting to set `isApproved` to `true`.
4. **Shadow Update**: Adding a `verificationSecret` field to an inventory item.
5. **Orphaned Transaction**: Creating a transaction without a valid `itemId`.
6. **Time Travel**: Providing a `createdAt` timestamp from the past.
7. **Quantity Poisoning**: Setting `currentQuantity` to a massive string or negative number.
8. **Resource Exhaustion**: Sending a 1MB string as an item name.
9. **Relational Bypass**: Deleting a project that belongs to another team (if team isolation were implemented).
10. **Admin Lockdown**: Attempting to delete the primary admin account.
11. **PII Scraping**: A non-approved user fetching the entire `users` collection.
12. **Status Skipping**: Finalizing a project without going through the intermediate states (if state transitions were enforced).

## Action Plan
- Hardening `isValidInventoryItem` with size limits and type guards.
- Restricted `read` access to `isApprovedUser()` for inventory and projects.
- Implementation of `affectedKeys().hasOnly()` for all `update` actions.
- Enforcing `request.time` for all timestamps.
- Blocking `delete` on `transactions_log` to maintain audit history.
