import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
    service: "Gmail", 
    auth: {
        user: process.env.EMAIL_USER, //寄件帳號
        pass: process.env.EMAIL_PASS, 
    },
});
export async function sendResetPasswordEmail({ to, subject, html }) {
    const info = await transporter.sendMail({
        from: `"HOW ORDER ARE YOU"<${process.env.EMAIL_USER}>`,
        to,
        subject,
        html,
    });

    console.log("Reset email sent:", info.messageId);
}

