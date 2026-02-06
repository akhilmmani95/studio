# **App Name**: TicketVerse

## Core Features:

- Event Listing and Details: Users can browse a list of events with details such as date, time, venue, and ticket options.
- Ticket Selection: Users can select ticket type (e.g., ₹500, ₹1000, ₹1500) and quantity for an event.
- User Information Capture: Collect user's name and phone number for booking purposes.
- Secure Payment Integration: Integrate with Razorpay or PhonePe for secure payment processing.
- Unique Ticket ID and QR Code Generation: Upon successful payment, generate a unique Ticket ID and a QR code containing a signed payload with ticketId, eventId, and HMAC/JWT signature. 
- Ticket Confirmation Page: Display a ticket confirmation page with the QR code and booking details.
- Secure Admin Login: Secure admin login to create, edit, and manage events and ticket information.
- Admin Panel for Event Management: Admin panel to create, edit events and manage ticket prices
- Booking Export and Revenue Tracking: Admins can export bookings as CSV and view total revenue.
- Offline Ticket Verification App (PWA): An installable PWA that scans QR codes, validates signatures offline, checks for redemption status, and marks tickets as redeemed locally.
- Offline Data Synchronization: Synchronize redeemed tickets with the server when internet is available and resolves conflicts safely, keeping time-stamped redemption logs.
- Fraud Prevention Tool: Employ generative AI tool that flags suspicious booking patterns, identifies potentially fraudulent transactions, and recommends actions, using machine learning on parameters like booking frequency, location anomalies, or unusual payment methods.

## Style Guidelines:

- Primary color: Deep purple (#673AB7) to convey sophistication and exclusivity, reflecting the high-value nature of live events.
- Background color: Light gray (#ECEFF1), providing a clean and neutral backdrop that ensures readability and focus on content.
- Accent color: Electric indigo (#6F42C1), used for interactive elements and key calls to action to draw the user's eye and enhance usability.
- Headline font: 'Space Grotesk' sans-serif font for headers, providing a modern and technical look.
- Body font: 'Inter' sans-serif for body text, ensures legibility and clean interface.
- Use minimalist and consistent icons that represent different event categories (e.g., music, sports, theater).
- Employ a responsive grid layout to ensure the web app is accessible and visually appealing on various devices and screen sizes.
- Subtle animations (e.g., fade-in effects) to create a smooth and engaging user experience.