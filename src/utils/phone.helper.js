import { parsePhoneNumberFromString } from "libphonenumber-js";

/**
 * Validate and normalize a phone number to E.164 format.
 *
 * Example:
 * 0771234567 + LK  -> +94771234567
 * +447911123456    -> +447911123456
 */
export const normalizePhoneNumber = (
  phoneNumber,
  defaultCountry = "LK"
) => {
  const phone = parsePhoneNumberFromString(
    phoneNumber,
    defaultCountry
  );

  if (!phone || !phone.isValid()) {
    throw new Error("Invalid phone number.");
  }

  return phone.number;
};