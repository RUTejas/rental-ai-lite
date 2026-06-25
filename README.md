# RentWise Lite

RentWise Lite is a simple Streamlit rental management app with owner approval, property and tenant records, rental agreements, document verification, and an automatic Rental Readiness Score.

## Features

- Master Admin account created automatically on first run
- Owner signup with Master Admin approval
- Tenant signup with owner/admin selection and manual owner approval
- Master Admin can approve or reject both owner and tenant accounts
- Forgot / Reset Password page for local account recovery
- Report Trouble page for login, approval, rent, document, and agreement issues
- Scoped Trouble Reports view for Master Admin and each owner
- Owner dashboard for tenants, properties, agreements, and documents
- Owner-only scoped data, so each admin sees only their tenants and records
- Tenant login with assigned property, agreement acceptance, and ID proof upload
- Tenant signup with owner/admin selection
- Monthly rent monitoring with paid, pending, partial, and overdue statuses
- Master Admin grouped visibility across owners, tenants, rent, documents, and agreements
- SQLite database stored locally as `rentwise_lite.db`
- Rule-based Rental Readiness Score:
  - Agreement accepted: 40 points
  - ID proof uploaded: 30 points
  - Document approved by owner: 30 points

## How to Run Locally

1. Install dependencies:

```bash
pip install -r requirements.txt
```

2. Start the app:

```bash
streamlit run streamlit_app.py
```

3. Open the local URL shown by Streamlit.

## Master Admin Login

- Email: `master@rentwise.ai`
- Password: `Master@12345`

The Master Admin is created automatically when the app starts for the first time.

## Demo Credentials

Use the same Login screen for Master Admin, Admin / Owner, and Tenant accounts. Choose the matching role from the Login as dropdown. These demo credentials are documented here for testing and are not displayed on the app login page.

| Role | Email | Password |
| --- | --- | --- |
| Master Admin | `master@rentwise.ai` | `Master@12345` |
| Approved Admin | `aarav.owner@rentwise.ai` | `Owner@12345` |
| Approved Admin | `meera.owner@rentwise.ai` | `Owner@22345` |
| Pending Admin | `rohan.pending@rentwise.ai` | `Owner@32345` |
| Tenant | `priya.tenant@rentwise.ai` | `Tenant@12345` |
| Tenant | `kabir.tenant@rentwise.ai` | `Tenant@22345` |
| Tenant | `anaya.tenant@rentwise.ai` | `Tenant@32345` |
| Tenant | `dev.tenant@rentwise.ai` | `Tenant@42345` |

## How to Test the Full Flow

1. Log in as Master Admin.
2. Open Signup in another session or log out, then create an Owner account.
3. Log back in as Master Admin and approve the Owner from Account Approvals.
4. Log in as the Owner.
5. Create a Tenant account from Signup and select that Owner.
6. Log in as the Owner and approve the Tenant from Tenant Approvals.
7. Add a property.
8. Assign the tenant to the property from Add Property.
9. Create a rental agreement for the assigned tenant.
10. Create or update monthly rent records from Rent Monitoring.
11. Log in as the tenant.
12. Open My Agreement and accept the agreement.
13. Open Upload Document and upload a PDF, JPG, JPEG, or PNG ID proof.
14. Log back in as the Owner and approve or reject the document from Document Verification.
15. Log in as the tenant again and check the updated Rental Readiness Score and My Rent page.

## Deploy on Streamlit Community Cloud

1. Push these files to a GitHub repository:
   - `streamlit_app.py`
   - `requirements.txt`
   - `.streamlit/config.toml`
   - `README.md`
2. Go to [Streamlit Community Cloud](https://streamlit.io/cloud).
3. Create a new app from your GitHub repository.
4. Set the main file path to `streamlit_app.py`.
5. Deploy.

Uploaded files and the SQLite database are stored on the app filesystem. For a small demo project this is fine, but Streamlit Cloud storage can reset when the app is redeployed or restarted.
