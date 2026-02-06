// This file is intentionally left blank to resolve a routing conflict in Next.js.
// The presence of a page at /booking/[id]/success was conflicting with
// /booking/[eventId]/[bookingId]/success due to different dynamic slug names ('id' vs 'eventId').
// By making this file not export a default component, we prevent Next.js from creating the conflicting route.
export {};
