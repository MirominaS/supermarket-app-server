import axios from "axios";

const BREVO_API_URL =
  process.env.BREVO_API_URL || "https://api.brevo.com/v3";

const BREVO_API_KEY = process.env.BREVO_API_KEY;
const BREVO_SENDER_EMAIL = process.env.BREVO_SENDER_EMAIL;
const BREVO_SENDER_NAME =
  process.env.BREVO_SENDER_NAME || "Supermarket";

export const sendOtpEmail = async ({
  recipientEmail,
  recipientName,
  otp,
}) => {
  if (!BREVO_API_KEY) {
    throw new Error("BREVO_API_KEY is not configured.");
  }

  if (!BREVO_SENDER_EMAIL) {
    throw new Error(
      "BREVO_SENDER_EMAIL is not configured."
    );
  }

  try {
    const response = await axios.post(
      `${BREVO_API_URL}/smtp/email`,
      {
        sender: {
          name: BREVO_SENDER_NAME,
          email: BREVO_SENDER_EMAIL,
        },

        to: [
          {
            email: recipientEmail,
            name: recipientName || recipientEmail,
          },
        ],

        subject: "Supermarket - OTP Verification",

        htmlContent: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="UTF-8" />
              <title>OTP Verification</title>
            </head>

            <body
              style="
                margin: 0;
                padding: 0;
                background-color: #f5f5f5;
                font-family: Arial, sans-serif;
              "
            >
              <div
                style="
                  max-width: 600px;
                  margin: 40px auto;
                  background: #ffffff;
                  padding: 30px;
                  border-radius: 10px;
                "
              >
                <h2 style="margin-bottom: 20px;">
                  Supermarket OTP Verification
                </h2>

                <p>
                  Hello ${recipientName || "Customer"},
                </p>

                <p>
                  Your verification code is:
                </p>

                <div
                  style="
                    font-size: 32px;
                    font-weight: bold;
                    letter-spacing: 8px;
                    margin: 25px 0;
                  "
                >
                  ${otp}
                </div>

                <p>
                  This OTP will expire in
                  <strong>5 minutes</strong>.
                </p>

                <p>
                  If you did not request this verification code,
                  please ignore this email.
                </p>

                <p>
                  Thank you,<br />
                  Supermarket Team
                </p>
              </div>
            </body>
          </html>
        `,
      },
      {
        headers: {
          "api-key": BREVO_API_KEY,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      }
    );

    return response.data;
  } catch (error) {
    console.error(
      "Brevo email error:",
      error.response?.data || error.message
    );

    throw new Error(
      "Failed to send OTP email."
    );
  }
};


// import { Resend } from "resend";

// const resend = new Resend(process.env.RESEND_API_KEY);

// export const sendOtpEmail = async ({ recipientEmail, recipientName, otp }) => {
//   try {
//     console.log("RESEND_API_KEY:", process.env.RESEND_API_KEY);
//     console.log("Sending email to:", recipientEmail);

//     const result = await resend.emails.send({
//       from: "Supermarket <onboarding@resend.dev>",
//       to: recipientEmail,
//       subject: "Supermarket - OTP Verification",
//       html: `
//       <!DOCTYPE html>
//       <html>
//       <body style="font-family:Arial,sans-serif">
//         <h2>Supermarket OTP Verification</h2>

//         <p>Hello ${recipientName || "Customer"},</p>

//         <p>Your verification code is:</p>

//         <h1>${otp}</h1>

//         <p>This OTP expires in <strong>5 minutes</strong>.</p>

//         <p>If you didn't request this code, please ignore this email.</p>

//         <br>

//         <p>Supermarket Team</p>

//       </body>
//       </html>
//     `,
//     });

//     console.log("Resend Response:", result);
//   } catch (error) {
//     console.error("Resend Error:", error);

//     throw new Error("Failed to send OTP email.");
//   }
// };
