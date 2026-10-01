---
title: The App Store Connect API accepts your metadata and rejects your submission
date: 2026-10-01 10:00:00
tags: [app-store, api, ios, release]
categories:
---
[Callback](https://apps.apple.com/us/app/callback-interview-prep/id6796242315) ships without me opening App Store Connect in a browser. A few Ruby scripts sign an ES256 JWT with the OpenSSL stdlib and talk to the API directly: push the listing, attach the build, submit to TestFlight, submit for review. For 0.2.0 every metadata call returned 200, and the review submission still failed. The two things that blocked it were not the thing I spent a session diagnosing. <!-- more -->

## The failure

Creating the review submission worked. Adding the version to it did not:

~~~
POST /v1/reviewSubmissions            → 201
POST /v1/reviewSubmissionItems        → 409
  STATE_ERROR: appStoreVersion is not in valid state — cannot be reviewed
~~~

Every gate I could read back looked green: export compliance set, age rating set, description, keywords, six screenshots at 1320×2868, review contact, build attached. So I went looking for a gate I could not read and found one: the App Privacy nutrition label. There is no public endpoint for it. Every spelling I tried (`/v1/appDataUsages`, `/v1/appDataUsagePublishState`, `/v1/apps/{id}/appDataUsagesPublishState`) answers `PATH_ERROR: resource does not exist`, not a 403. I concluded the unpublished label was the blocker.

It was not. The label was already published.

## Read the 409 body

The next session started by reading the whole error body instead of the first line. The 409 from `POST /v1/reviewSubmissionItems` carries a `meta.associatedErrors` map that names every failing gate by resource path. Two entries. Neither was privacy.

**Gate 1: `copyright`.** It is an attribute of the `appStoreVersions` record, not of the version localization where description and keywords live. My script patched the localization for every release, every patch succeeded, and the version record never had a copyright string. Nothing complains until submit time, when it surfaces as `ENTITY_ERROR.ATTRIBUTE.REQUIRED`. The fix is one more PATCH:

~~~ruby
# `copyright` hangs off the version record, not the localization, so it is easy
# to miss: every metadata PATCH succeeds without it and ASC only surfaces it at
# submit time, as an ENTITY_ERROR.ATTRIBUTE.REQUIRED inside the 409 that
# POST /v1/reviewSubmissionItems returns. It blocked the 0.2.0 submission once.
patch_attrs("/v1/appStoreVersions/#{version_id}", "appStoreVersions", version_id,
            { copyright: field("Copyright") }, "copyright → #{field('Copyright').inspect}")
~~~

The value comes from the same Markdown listing file as the rest of the metadata, with a 100-character limit added to the validator next to the other field limits.

**Gate 2: pricing.** This one lied harder. `GET /v1/apps/{id}/appPriceSchedule` returned 200 with `baseTerritory: USA`, which I read as "pricing is set". The `manualPrices` relationship in the same response was empty. A 200 on a container resource means the container exists, not that it has anything in it.

The runbook I was working from said pricing can only be set in the web UI. That is wrong. It is a single POST with an included price entry whose dates are nil, which means "from now, forever":

~~~json
{
  "data": {
    "type": "appPriceSchedules",
    "relationships": {
      "app":           { "data": { "type": "apps", "id": "APP_ID" } },
      "baseTerritory": { "data": { "type": "territories", "id": "USA" } },
      "manualPrices":  { "data": [{ "type": "appPrices", "id": "${new-price-1}" }] }
    }
  },
  "included": [{
    "type": "appPrices",
    "id": "${new-price-1}",
    "attributes": { "startDate": null, "endDate": null },
    "relationships": {
      "appPricePoint": { "data": { "type": "appPricePoints", "id": "PRICE_POINT_ID" } }
    }
  }]
}
~~~

The `${new-price-1}` placeholder is how JSON:API lets you create the parent and the child in one request. The free price point ID comes from `/v1/apps/{id}/appPricePoints?filter[territory]=USA`. The `/v2/` forms of these paths, which some docs still reference, 404.

## Things the API does that are worth knowing

- **A review submission with no items cannot be deleted.** Both delete and cancel fail with a 403 or 409. It is harmless. Reuse it on the retry instead of creating another.
- **Renaming a version record is allowed.** The 0.1.0 record was never released and every uploaded build was 0.2.0, so the script patches `versionString` on the open record instead of creating a new one. ASC only offers builds whose `CFBundleShortVersionString` matches the record.
- **Attach the build through the relationship endpoint**, `PATCH /v1/appStoreVersions/{id}/relationships/build`, then read the version back. Do not trust the request succeeding.
- **Dry-run the metadata script before touching a version in review.** A real push could disturb a `WAITING_FOR_REVIEW` record, so the copyright fix was verified with `--dry-run --skip-screenshots` only and pushed for real on the next release.

## Outcome

With both gates fixed, the reused submission accepted the version and went to `WAITING_FOR_REVIEW` on 2026-08-04 with `releaseType: AFTER_APPROVAL`. Review later bounced it once under guideline 5.2.5 for the word "iOS" in the subtitle. One line changed in the listing file, resubmitted, and it has been live since 2026-08-21.

The lesson is less about Apple than about my own diagnosis. I spent a session inferring the blocker by elimination across gates I could read, when the response I already had named both gates I could not see. Read the whole error body first.

Related: [Four App Store apps in ten weeks, solo](/post/Four-App-Store-apps-in-ten-weeks/).
