// DEPRECATED
// This route is no longer used. We now use /api/send-otp and /api/verify-otp for secure OTP verification.
export async function POST() {
  return new Response('Deprecated', { status: 410 })
}
