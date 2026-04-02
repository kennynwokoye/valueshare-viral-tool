import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  host: 'smtp.zeptomail.com',
  port: 465,
  secure: true,
  auth: {
    user: 'emailapikey',
    pass: process.env.ZEPTOMAIL_SMTP_PASSWORD,
  },
})

const FROM = `ValueShare <noreply@valueshare.co>`
const APP_URL = (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, '')

async function sendEmail({ to, subject, html }: { to: string; subject: string; html: string }) {
  await transporter.sendMail({ from: FROM, to, subject, html })
}

function baseTemplate(content: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ValueShare</title>
</head>
<body style="margin:0;padding:0;background:#07070f;font-family:'DM Mono',monospace;color:#f0f0f8;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#07070f;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;">
          <tr>
            <td style="padding-bottom:24px;text-align:center;">
              <span style="font-family:'Syne',sans-serif;font-size:20px;font-weight:800;letter-spacing:-0.02em;">
                <span style="color:#f0f0f8;">Value</span><span style="color:#00FF94;">Share</span>
              </span>
            </td>
          </tr>
          <tr>
            <td style="background:#0e0e1a;border:1px solid #1e1e30;border-radius:4px;padding:36px;">
              ${content}
            </td>
          </tr>
          <tr>
            <td style="padding-top:24px;text-align:center;font-size:11px;color:#505068;">
              If you didn&rsquo;t request this, you can safely ignore this email.<br />
              <span style="margin-top:8px;display:inline-block;">
                You are receiving this because you have an account or campaign on ValueShare.
                To unsubscribe from non-essential emails, visit
                <a href="${APP_URL}/preferences" style="color:#505068;">valueshare.co/preferences</a>
                or reply to this email with &ldquo;unsubscribe&rdquo;.<br />
                ValueShare &mdash; Value-Driven Growth Platform
              </span>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

export async function sendOtpEmail({
  to,
  otp,
}: {
  to: string
  otp: string
}) {
  const content = `
    <p style="font-size:13px;color:#9090a8;margin:0 0 20px 0;text-align:center;">
      Here&rsquo;s your login verification code:
    </p>
    <div style="text-align:center;margin:0 0 20px 0;">
      <span style="font-family:'Syne',sans-serif;font-size:36px;font-weight:800;letter-spacing:0.15em;color:#00FF94;">
        ${otp}
      </span>
    </div>
    <p style="font-size:11px;color:#505068;margin:0;text-align:center;">
      This code expires in 15 minutes.
    </p>`

  await sendEmail({
    to,
    subject: `${otp} \u2014 Your ValueShare login code`,
    html: baseTemplate(content),
  })
}

export async function sendRewardUnlockedEmail({
  to,
  rewardLabel,
  tierLabel,
  campaignTitle,
  accessToken,
  rewardType,
}: {
  to: string
  rewardLabel: string
  tierLabel: string
  campaignTitle: string
  accessToken: string
  rewardType: string
}) {
  const prizeUrl = `${APP_URL}/prize/${accessToken}`

  const ctaBlock =
    rewardType === 'call_booking'
      ? `<p style="font-size:13px;color:#9090a8;margin:20px 0 0 0;text-align:center;padding:14px;background:rgba(0,255,148,0.08);border:1px solid rgba(0,255,148,0.2);border-radius:2px;">
          Your reward is being arranged &mdash; we&rsquo;ll be in touch shortly.
        </p>`
      : `<div style="text-align:center;margin:24px 0 0 0;">
          <a href="${prizeUrl}" style="display:inline-block;background:#00FF94;color:#07070f;font-family:'DM Mono',monospace;font-size:13px;font-weight:600;padding:14px 28px;border-radius:2px;text-decoration:none;letter-spacing:0.05em;">
            Claim My Reward &rarr;
          </a>
        </div>`

  const content = `
    <p style="font-size:20px;text-align:center;margin:0 0 16px 0;">&#127881;</p>
    <h2 style="font-family:'Syne',sans-serif;font-size:22px;font-weight:700;color:#f0f0f8;margin:0 0 8px 0;text-align:center;letter-spacing:-0.02em;">
      Congratulations!
    </h2>
    <p style="font-size:13px;color:#9090a8;margin:0 0 20px 0;text-align:center;">
      You&rsquo;ve unlocked <strong style="color:#f0f0f8;">${rewardLabel}</strong> in <strong style="color:#f0f0f8;">${campaignTitle}</strong>.
    </p>
    <div style="background:#141425;border:1px solid #1e1e30;border-radius:2px;padding:16px;text-align:center;margin:0 0 4px 0;">
      <span style="font-size:10px;text-transform:uppercase;letter-spacing:0.1em;color:#505068;">${tierLabel}</span>
      <p style="font-size:15px;color:#00FF94;margin:6px 0 0 0;font-weight:600;">${rewardLabel}</p>
    </div>
    ${ctaBlock}`

  await sendEmail({
    to,
    subject: `\u{1F389} You unlocked: ${rewardLabel}`,
    html: baseTemplate(content),
  })
}

export async function sendParticipantWelcomeEmail({
  to,
  campaignTitle,
  referralLink,
  threshold,
  kpiType,
}: {
  to: string
  campaignTitle: string
  referralLink: string
  threshold: number
  kpiType: string
}) {
  const content = `
    <h2 style="font-family:'Syne',sans-serif;font-size:22px;font-weight:700;color:#f0f0f8;margin:0 0 8px 0;text-align:center;letter-spacing:-0.02em;">
      You&rsquo;re in!
    </h2>
    <p style="font-size:13px;color:#9090a8;margin:0 0 24px 0;text-align:center;">
      You&rsquo;ve joined <strong style="color:#f0f0f8;">${campaignTitle}</strong>. Share your ValueShare link to unlock rewards.
    </p>
    <div style="background:#141425;border:1px solid #1e1e30;border-radius:2px;padding:16px;margin:0 0 16px 0;">
      <span style="font-size:10px;text-transform:uppercase;letter-spacing:0.1em;color:#505068;">Your Goal</span>
      <p style="font-size:14px;color:#f0f0f8;margin:6px 0 0 0;">
        Get <strong style="color:#00FF94;">${threshold} ${kpiType}</strong> to unlock your first reward
      </p>
    </div>
    <div style="background:#141425;border:1px solid #1e1e30;border-radius:2px;padding:16px;margin:0 0 24px 0;">
      <span style="font-size:10px;text-transform:uppercase;letter-spacing:0.1em;color:#505068;">Your ValueShare Link</span>
      <p style="font-size:12px;color:#00FF94;margin:6px 0 0 0;word-break:break-all;">${referralLink}</p>
    </div>
    <div style="text-align:center;">
      <a href="${APP_URL}/dashboard/participant" style="display:inline-block;background:#00FF94;color:#07070f;font-family:'DM Mono',monospace;font-size:13px;font-weight:600;padding:14px 28px;border-radius:2px;text-decoration:none;letter-spacing:0.05em;">
        Go to Dashboard &rarr;
      </a>
    </div>`

  await sendEmail({
    to,
    subject: `You joined '${campaignTitle}'!`,
    html: baseTemplate(content),
  })
}

export async function sendCreatorRewardNotification({
  to,
  participantEmail,
  rewardLabel,
  campaignTitle,
}: {
  to: string
  participantEmail: string
  rewardLabel: string
  campaignTitle: string
}) {
  const content = `
    <h2 style="font-family:'Syne',sans-serif;font-size:22px;font-weight:700;color:#f0f0f8;margin:0 0 8px 0;text-align:center;letter-spacing:-0.02em;">
      Action Required
    </h2>
    <p style="font-size:13px;color:#9090a8;margin:0 0 20px 0;text-align:center;">
      A participant has earned a reward that needs your attention.
    </p>
    <div style="background:#141425;border:1px solid #1e1e30;border-radius:2px;padding:16px;margin:0 0 16px 0;">
      <span style="font-size:10px;text-transform:uppercase;letter-spacing:0.1em;color:#505068;">Campaign</span>
      <p style="font-size:14px;color:#f0f0f8;margin:6px 0 0 0;">${campaignTitle}</p>
    </div>
    <div style="background:#141425;border:1px solid #1e1e30;border-radius:2px;padding:16px;margin:0 0 16px 0;">
      <span style="font-size:10px;text-transform:uppercase;letter-spacing:0.1em;color:#505068;">Participant</span>
      <p style="font-size:14px;color:#00FF94;margin:6px 0 0 0;">${participantEmail}</p>
    </div>
    <div style="background:#141425;border:1px solid #1e1e30;border-radius:2px;padding:16px;margin:0 0 24px 0;">
      <span style="font-size:10px;text-transform:uppercase;letter-spacing:0.1em;color:#505068;">Reward Earned</span>
      <p style="font-size:14px;color:#f0f0f8;margin:6px 0 0 0;">${rewardLabel}</p>
    </div>
    <div style="text-align:center;">
      <a href="${APP_URL}/dashboard/creator" style="display:inline-block;background:#00FF94;color:#07070f;font-family:'DM Mono',monospace;font-size:13px;font-weight:600;padding:14px 28px;border-radius:2px;text-decoration:none;letter-spacing:0.05em;">
        View in Dashboard &rarr;
      </a>
    </div>`

  await sendEmail({
    to,
    subject: `Action needed: Deliver reward to ${participantEmail}`,
    html: baseTemplate(content),
  })
}

export async function sendFraudAlertEmail({
  to,
  campaignTitle,
  fraudCount,
}: {
  to: string
  campaignTitle: string
  fraudCount: number
}) {
  const content = `
    <h2 style="font-family:'Syne',sans-serif;font-size:22px;font-weight:700;color:#f0f0f8;margin:0 0 8px 0;text-align:center;letter-spacing:-0.02em;">
      &#9888; Fraud Spike Detected
    </h2>
    <p style="font-size:13px;color:#9090a8;margin:0 0 20px 0;text-align:center;">
      Suspicious activity has been detected on one of your campaigns.
    </p>
    <div style="background:#141425;border:1px solid #1e1e30;border-radius:2px;padding:16px;margin:0 0 12px 0;">
      <span style="font-size:10px;text-transform:uppercase;letter-spacing:0.1em;color:#505068;">Campaign</span>
      <p style="font-size:14px;color:#f0f0f8;margin:6px 0 0 0;">${campaignTitle}</p>
    </div>
    <div style="background:#141425;border:1px solid rgba(232,93,58,0.3);border-radius:2px;padding:16px;margin:0 0 24px 0;">
      <span style="font-size:10px;text-transform:uppercase;letter-spacing:0.1em;color:#505068;">Suspicious Clicks (Last Hour)</span>
      <p style="font-size:28px;color:#e85d3a;margin:6px 0 0 0;font-weight:700;">${fraudCount}</p>
    </div>
    <div style="text-align:center;">
      <a href="${APP_URL}/dashboard/creator?tab=fraud" style="display:inline-block;background:#e85d3a;color:#fff;font-family:'DM Mono',monospace;font-size:13px;font-weight:600;padding:14px 28px;border-radius:2px;text-decoration:none;letter-spacing:0.05em;">
        View Fraud Shield &rarr;
      </a>
    </div>`

  await sendEmail({
    to,
    subject: `\u26a0\ufe0f Fraud spike detected \u2014 ${campaignTitle}`,
    html: baseTemplate(content),
  })
}

interface WeeklyDigestParams {
  to: string
  creatorName: string
  stats: {
    clicks7: number
    newParticipants: number
    rewardsDelivered: number
    fraudBlocked: number
    topCampaign?: { name: string; clicks: number }
    topParticipant?: { email: string; clicks: number }
    startDate: string
    endDate: string
  }
}

export async function sendCreatorConfirmationEmail({
  to,
  confirmationUrl,
}: {
  to: string
  confirmationUrl: string
}) {
  const content = `
    <h2 style="font-family:'Syne',sans-serif;font-size:22px;font-weight:700;color:#f0f0f8;margin:0 0 8px 0;text-align:center;letter-spacing:-0.02em;">
      Confirm your email
    </h2>
    <p style="font-size:13px;color:#9090a8;margin:0 0 24px 0;text-align:center;">
      Click the button below to verify your email address and activate your ValueShare creator account.
    </p>
    <div style="text-align:center;margin:0 0 24px 0;">
      <a href="${confirmationUrl}" style="display:inline-block;background:#00FF94;color:#07070f;font-family:'DM Mono',monospace;font-size:13px;font-weight:600;padding:14px 28px;border-radius:2px;text-decoration:none;letter-spacing:0.05em;">
        Confirm Email &rarr;
      </a>
    </div>
    <p style="font-size:11px;color:#505068;margin:0;text-align:center;">
      This link expires in 24 hours. If you didn&rsquo;t create an account, you can safely ignore this email.
    </p>`

  await sendEmail({
    to,
    subject: `Confirm your ValueShare creator account`,
    html: baseTemplate(content),
  })
}

export async function sendWeeklyDigestEmail({ to, creatorName, stats }: WeeklyDigestParams) {
  const maskEmail = (email: string) => {
    const [user, domain] = email.split('@')
    if (!user || user.length < 2) return email
    const masked = user.charAt(0) + '***' + user.charAt(user.length - 1)
    return `${masked}@${domain}`
  }

  const content = `
    <h2 style="font-family:'Syne',sans-serif;font-size:22px;font-weight:700;color:#f0f0f8;margin:0 0 4px 0;text-align:center;letter-spacing:-0.02em;">
      &#128202; Your ValueShare Week
    </h2>
    <p style="font-size:12px;color:#505068;margin:0 0 8px 0;text-align:center;">Hey ${creatorName}!</p>
    <p style="font-size:12px;color:#505068;margin:0 0 24px 0;text-align:center;">${stats.startDate} &mdash; ${stats.endDate}</p>

    <p style="font-size:11px;text-transform:uppercase;letter-spacing:.1em;color:#505068;margin:0 0 12px 0;">This week at a glance</p>
    <table width="100%" cellpadding="0" cellspacing="6" style="margin:0 0 20px 0;">
      <tr>
        <td style="background:#141425;border:1px solid #1e1e30;border-radius:2px;padding:14px;text-align:center;width:50%;">
          <div style="font-size:26px;font-weight:700;color:#00FF94;">${stats.clicks7}</div>
          <div style="font-size:11px;color:#505068;margin-top:4px;">Clicks</div>
        </td>
        <td style="background:#141425;border:1px solid #1e1e30;border-radius:2px;padding:14px;text-align:center;width:50%;">
          <div style="font-size:26px;font-weight:700;color:#00FF94;">${stats.newParticipants}</div>
          <div style="font-size:11px;color:#505068;margin-top:4px;">New Participants</div>
        </td>
      </tr>
      <tr>
        <td style="background:#141425;border:1px solid #1e1e30;border-radius:2px;padding:14px;text-align:center;">
          <div style="font-size:26px;font-weight:700;color:#00FF94;">${stats.rewardsDelivered}</div>
          <div style="font-size:11px;color:#505068;margin-top:4px;">Rewards Delivered</div>
        </td>
        <td style="background:#141425;border:1px solid #1e1e30;border-radius:2px;padding:16px;text-align:center;">
          <div style="font-size:26px;font-weight:700;color:#e85d3a;">${stats.fraudBlocked}</div>
          <div style="font-size:11px;color:#505068;margin-top:4px;">Fraud Blocked</div>
        </td>
      </tr>
    </table>

    ${stats.topCampaign ? `
    <div style="background:#141425;border:1px solid #1e1e30;border-radius:2px;padding:16px;margin:0 0 12px 0;">
      <span style="font-size:10px;text-transform:uppercase;letter-spacing:0.1em;color:#505068;">Top Campaign</span>
      <p style="font-size:14px;color:#f0f0f8;margin:6px 0 2px 0;font-weight:600;">${stats.topCampaign.name}</p>
      <p style="font-size:12px;color:#00FF94;margin:0;">${stats.topCampaign.clicks} total clicks</p>
    </div>` : ''}

    ${stats.topParticipant ? `
    <div style="background:#141425;border:1px solid #1e1e30;border-radius:2px;padding:16px;margin:0 0 24px 0;">
      <span style="font-size:10px;text-transform:uppercase;letter-spacing:0.1em;color:#505068;">Top Performer</span>
      <p style="font-size:14px;color:#f0f0f8;margin:6px 0 2px 0;font-weight:600;">${maskEmail(stats.topParticipant.email)}</p>
      <p style="font-size:12px;color:#00FF94;margin:0;">${stats.topParticipant.clicks} clicks this week</p>
    </div>` : '<div style="margin:0 0 24px 0;"></div>'}

    <div style="text-align:center;">
      <a href="${APP_URL}/dashboard/creator?tab=analytics" style="display:inline-block;background:#00FF94;color:#07070f;font-family:'DM Mono',monospace;font-size:13px;font-weight:600;padding:14px 28px;border-radius:2px;text-decoration:none;letter-spacing:0.05em;">
        View Full Analytics &rarr;
      </a>
    </div>`

  await sendEmail({
    to,
    subject: `\u{1F4CA} Your ValueShare Week \u2014 ${stats.startDate}`,
    html: baseTemplate(content),
  })
}
