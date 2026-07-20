---
name: runner-app-proof-of-work
description: "Pipeline for building the mobile-first worker app and photo-verification system."
version: 1.1.0
---

# Runner App & Proof-of-Work Pipeline
This is the core operational engine of CurbSitter. Execution must prioritize mobile responsiveness for field workers with or without internet connection. If the mobile device loses connectivity, the employee must still receive map and directions to property, view property details and assigned tasks, take and upload proof-of-work photo, select an exception (if applicable), and if first visit, log the GPS coordinates of the trash bin(s) storage location. Even without internet connectivity, employee must be able to submit photo proof-of-work to trigger the cycling of jobs to automatically populate the subsequent property info, etc. until connectivity is restored. Therefore, it may be necessary to download all route info ahead of time so routes can be completed with data uploads for every property regardless of internet connectivity. Assuming no internet for entire route, all stored data must be stored on the device until internet connection is restored, allowing for full data transfer and automatic updates across all customer and admin dashboards, SMS notifications/alerts, etc.

## Phase 1: Mapbox Route Display
1. **Initialize Runner Layout:** 
Create the `/runner-app` directory with a strict mobile-first viewport.

2. **Fetch Daily Stops:** 
Query the `properties` table for active subscriptions scheduled for the current day.

3. **Map Integration:** 
Use Mapbox to render pins for each stop. Cluster pins to visually demonstrate route density and optimal travel paths, analyzing the data to improve route efficiency in the following ways:
        * Minimize the number  of left-hand turns

## Phase 2: The Proof-of-Work Camera Engine
1. **Service Action:** 
When a worker taps a property pin, open the "Service Stop" UI showing gate codes and property notes.

2. **Camera Integration:** 
Build an HTML5/Next.js native camera capture component.

3. **Upload Logic:**
        * Worker snaps a photo of the bins successfully returned to the side of the house/locked gate.
        * Upload the image to Supabase Storage.
        * Save the generated URL to the `service_logs` table with a server-side timestamp.
    
4. **Automated Notification (The Core Value Add):**
        * Trigger a backend edge function immediately upon successful photo upload: "Your CurbSitter has securely returned your bins. View verification: [Link to 
        Photo]"*
        * Send an automated SMS (via Twilio) to the phone number(s) listed for each property (limited to (1) one user/admin account for 'Starter' and 'Plus' 
        subscriptions and up to (3) three user/admin accounts ((1) one admin and up to (2) two user accounts) for HOA/STR subscriptions.
