import { parsePhoneNumberFromString } from "libphonenumber-js";

/**
 * Validate and normalize a phone number to E.164 format.
 *
 * The customer must supply an international number
 * containing a country calling code.
 *
 * Examples:
 * +94771234567 -> +94771234567
 * +447911123456 -> +447911123456
 * 0771234567 -> rejected
 */
export const normalizePhoneNumber = (phoneNumber) => {
  if (
    typeof phoneNumber !== "string" ||
    !phoneNumber.trim()
  ) {
    throw new Error("Phone number with country code is required.");
  }

  const value = phoneNumber.trim();

  // Require an explicit international country calling code
  if (!value.startsWith("+")) {
    throw new Error(
      "Country code is required. Include it in the phone number, e.g. +94771234567."
    );
  }

  const phone = parsePhoneNumberFromString(value);

  if (!phone || !phone.isValid()) {
    throw new Error("Invalid phone number or country code.");
  }

  return phone.number;
};