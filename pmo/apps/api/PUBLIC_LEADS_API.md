# Public Leads API

## Overview

The Public Leads API provides an unauthenticated endpoint for capturing leads from your website's contact forms and lead magnets.

## Endpoint

```
POST /api/public/inbound-leads
```

**Important:** This endpoint is publicly accessible (no authentication required) to allow website forms to submit leads directly.

## Rate Limiting

- **Limit:** 5 submissions per 15 minutes per IP address
- **Headers:**
  - `X-RateLimit-Limit`: Maximum requests allowed
  - `X-RateLimit-Remaining`: Remaining requests in current window
  - `X-RateLimit-Reset`: ISO timestamp when the limit resets
  - `Retry-After`: Seconds to wait before retrying (only on 429 responses)

## Request Format

### Headers

```
Content-Type: application/json
```

### Body

```json
{
  "name": "Ada Lovelace",
  "email": "ada@acme.ai",
  "tenantSlug": "your-tenant-slug",
  "company": "Acme AI",
  "website": "https://acme.ai",
  "serviceInterest": "STRATEGY",
  "message": "We need help scoping AI roadmap.",
  "source": "WEBSITE_CONTACT",
  "page": "/services/ai-strategy",
  "utmSource": "linkedin",
  "utmMedium": "social",
  "utmCampaign": "q4-2024",
  "utmContent": "cta-button",
  "utmTerm": "ai-strategy"
}
```

### Field Specifications

#### Required Fields

- `name` (string): Contact's full name
- `email` (string): Valid email address
- `tenantSlug` (string): Your tenant's unique slug (used to route leads to the correct CRM tenant). You can find your tenant slug in the CRM under **Settings → Organization → Tenant Slug**, or ask your CRM administrator.

#### Optional Fields

- `company` (string): Company name
- `website` (string): Company website (must be valid URL or empty string)
- `serviceInterest` (enum): Type of service they're interested in
  - `STRATEGY`
  - `POC`
  - `IMPLEMENTATION`
  - `TRAINING`
  - `PMO_ADVISORY`
  - `NOT_SURE` (default)
- `message` (string): Free-form message from the contact
- `source` (enum): Lead source
  - `WEBSITE_CONTACT` (default)
  - `WEBSITE_DOWNLOAD`
  - `REFERRAL`
  - `LINKEDIN`
  - `OUTBOUND`
  - `EVENT`
  - `OTHER`

#### Tracking Fields (all optional)

- `page` (string): URL path where form was submitted (e.g., `/contact`, `/services/ai-strategy`)
- `utmSource` (string): Traffic source (e.g., `linkedin`, `google`, `twitter`)
- `utmMedium` (string): Marketing medium (e.g., `social`, `email`, `cpc`)
- `utmCampaign` (string): Campaign name (e.g., `q4-2024`, `product-launch`)
- `utmContent` (string): Content identifier (e.g., `cta-button`, `footer-link`)
- `utmTerm` (string): Search term (for paid search)

## Response Format

### Success Response (201 Created)

```json
{
  "success": true,
  "leadId": "123"
}
```

### Error Responses

#### Validation Error (400 Bad Request)

```json
{
  "error": "Invalid lead data",
  "details": {
    "email": {
      "_errors": ["Invalid email address"]
    }
  }
}
```

#### Rate Limit Exceeded (429 Too Many Requests)

```json
{
  "error": "Too many lead submissions. Please try again in 15 minutes.",
  "retryAfter": 847
}
```

#### Server Error (500 Internal Server Error)

```json
{
  "error": "Failed to submit your information. Please try again later."
}
```

## Example Usage

### HTML Form Example

```html
<form id="contact-form">
  <input type="text" name="name" placeholder="Your Name" required />
  <input type="email" name="email" placeholder="Email" required />
  <input type="text" name="company" placeholder="Company" />
  <select name="serviceInterest">
    <option value="NOT_SURE">Not sure yet</option>
    <option value="STRATEGY">AI Strategy</option>
    <option value="POC">Proof of Concept</option>
    <option value="IMPLEMENTATION">Implementation</option>
    <option value="TRAINING">Training</option>
    <option value="PMO_ADVISORY">PMO Advisory</option>
  </select>
  <textarea name="message" placeholder="Tell us about your needs"></textarea>
  <button type="submit">Submit</button>
</form>

<script>
  document
    .getElementById('contact-form')
    .addEventListener('submit', async (e) => {
      e.preventDefault();

      const formData = new FormData(e.target);
      const data = {
        name: formData.get('name'),
        email: formData.get('email'),
        company: formData.get('company'),
        serviceInterest: formData.get('serviceInterest'),
        message: formData.get('message'),
        source: 'WEBSITE_CONTACT',
        page: window.location.pathname,
        // Capture UTM parameters from URL
        utmSource: new URLSearchParams(window.location.search).get(
          'utm_source',
        ),
        utmMedium: new URLSearchParams(window.location.search).get(
          'utm_medium',
        ),
        utmCampaign: new URLSearchParams(window.location.search).get(
          'utm_campaign',
        ),
      };

      try {
        const response = await fetch(
          'http://localhost:4000/api/public/inbound-leads',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
          },
        );

        const result = await response.json();

        if (response.ok) {
          alert("Thank you for your interest! We'll be in touch soon.");
          e.target.reset();
        } else {
          alert('Error: ' + result.error);
        }
      } catch (error) {
        alert('Network error. Please try again.');
      }
    });
</script>
```

### JavaScript/TypeScript Fetch Example

```typescript
async function submitLead(leadData: {
  name: string;
  email: string;
  company?: string;
  serviceInterest?: string;
  message?: string;
}) {
  const response = await fetch(
    'http://localhost:4000/api/public/inbound-leads',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...leadData,
        source: 'WEBSITE_CONTACT',
        page: window.location.pathname,
        utmSource: new URLSearchParams(window.location.search).get(
          'utm_source',
        ),
      }),
    },
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to submit lead');
  }

  return response.json();
}
```

### React Hook Example

```typescript
import { useState } from 'react';

interface LeadFormData {
  name: string;
  email: string;
  company?: string;
  serviceInterest?: string;
  message?: string;
}

export function useLeadSubmission() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submitLead = async (data: LeadFormData) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/public/inbound-leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          source: 'WEBSITE_CONTACT',
          page: window.location.pathname,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Submission failed');
      }

      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { submitLead, loading, error };
}
```

## Security Considerations

1. **Rate Limiting:** Built-in rate limiting prevents spam (5 requests per 15 minutes per IP)
2. **Input Validation:** All inputs are validated and sanitized using Zod schemas
3. **No Authentication Required:** This is intentional for public lead capture
4. **CORS:** Configure your API's CORS settings to only allow requests from your domain in production

## TODO / Future Enhancements

The following features are planned but not yet implemented:

1. **Email Notifications:** Automatic email to sales team when new lead is submitted
2. **Auto-task Creation:** Create follow-up tasks (e.g., "Reply to Ada - due in 24h") when lead is assigned
3. **CAPTCHA Integration:** Add reCAPTCHA or hCaptcha for additional spam protection
4. **Webhook Support:** Trigger webhooks to external services (Slack, CRM, etc.)
5. **Lead Scoring:** Automatic lead scoring based on form data and engagement
6. **Duplicate Detection:** Check for duplicate email addresses before creating new leads

## Testing

You can test the endpoint using curl:

```bash
curl -X POST http://localhost:4000/api/public/inbound-leads \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "company": "Test Corp",
    "serviceInterest": "STRATEGY",
    "message": "Just testing the API",
    "source": "WEBSITE_CONTACT",
    "page": "/contact"
  }'
```

## Database Schema

Leads are stored in the `InboundLead` table with the following fields:

- `id`: Auto-incrementing primary key
- `email`: Required
- `name`, `company`, `website`, `message`: Optional text fields
- `source`: Lead source enum (default: OTHER)
- `serviceInterest`: Service interest enum (default: NOT_SURE)
- `status`: Lead status enum (default: NEW)
- `page`, `utmSource`, `utmMedium`, `utmCampaign`, `utmContent`, `utmTerm`: Tracking fields
- `ownerUserId`, `clientId`, `primaryContactId`: Foreign keys (for qualified leads)
- `firstResponseAt`: Timestamp of first response
- `createdAt`, `updatedAt`: Automatic timestamps
