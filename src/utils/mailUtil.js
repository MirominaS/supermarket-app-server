import Brevo from "@getbrevo/brevo";

const brevoClient = new Brevo.TransactionalEmailsApi();

brevoClient.setApiKey(
  Brevo.TransactionalEmailsApiApiKeys.apiKey,
  process.env.BREVO_API_KEY
);

export const sendOtpEmail = async (email, otp) => {
  const emailData = new Brevo.SendSmtpEmail();

  emailData.subject = "Supermarket - Email Verification";

  emailData.sender = {
    name: process.env.BREVO_SENDER_NAME,
    email: process.env.BREVO_SENDER_EMAIL,
  };

  emailData.to = [
    {
      email: email,
    },
  ];

  emailData.htmlContent = `
    <div style="font-family: Arial, sans-serif;">
      <h2>Supermarket Email Verification</h2>

      <p>Thank you for registering with our supermarket.</p>

      <p>Your verification code is:</p>

      <h1>${otp}</h1>

      <p>This OTP will expire in 5 minutes.</p>

      <p>If you did not request this code, please ignore this email.</p>
    </div>
  `;

  await brevoClient.sendTransacEmail(emailData);
};