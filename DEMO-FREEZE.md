# Wednesday Demo Freeze

This `demo-ready` branch is the known demonstration line for the Apostle Cynthia / CTG Engagements story.

Until the Wednesday demonstration is complete:

- bug fixes only;
- no new workflow concepts;
- no new navigation patterns;
- no database resets;
- do not replace the executive dashboard or host-collaboration workflow;
- every change must keep the `Validate` workflow green on `demo-ready`.

## Frozen demonstration story

1. Open Engagements as **Apostle Cynthia / Executive View**.
2. Scan the visual travel/ministry dashboard.
3. Open a confirmed engagement and remain in the read-only **Executive Engagement Brief**.
4. Return using **Back to my overview**.
5. Switch to Coordinator/Admin for the Booking Desk operational story.
6. Convert/open an engagement once; do not duplicate the engagement record.
7. Open the Host Collaboration link.
8. Host updates travel/lodging/schedule/contacts/prayer focus/documents and chooses **Save progress**.
9. CTG sees those updates on the same engagement record.
10. Return to Apostle Cynthia and show the high-level ministry picture.

## Required pre-demo check

From the repo after rebuilding Engagements:

```powershell
.\scripts\Verify-WednesdayDemo.ps1
```

If any automated check or click-rehearsal step fails, fix only that failure and rerun the verification before the demo.
