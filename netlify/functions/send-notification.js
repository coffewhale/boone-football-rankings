// Send notifications via email when rankings are updated
exports.handler = async (event, context) => {
    const { type, weekNumber, articleTimestamp, url } = JSON.parse(event.body);
    
    try {
        // Option 1: Use Netlify Forms (Free)
        await sendNetlifyFormEmail(type, weekNumber, articleTimestamp, url);
        
        // Option 2: Use SendGrid (if you have API key)
        // await sendEmailViaSendGrid(type, weekNumber, articleTimestamp, url);
        
        return {
            statusCode: 200,
            body: JSON.stringify({
                success: true,
                message: 'Notification sent'
            })
        };
    } catch (error) {
        console.error('Error sending notification:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({
                success: false,
                error: error.message
            })
        };
    }
};

// Free option using Netlify Forms
async function sendNetlifyFormEmail(type, weekNumber, articleTimestamp, url) {
    const fetch = require('node-fetch');
    
    const subject = `🚨 Boone Rankings Update - Week ${weekNumber}`;
    const message = `
Justin Boone has updated his Week ${weekNumber} fantasy football rankings!

📅 Updated: ${new Date(articleTimestamp).toLocaleString()}
🔗 URL: ${url}

Time to update your rankings site!
    `.trim();
    
    // Submit to a Netlify form (you'll need to create this form)
    const formData = new URLSearchParams();
    formData.append('form-name', 'ranking-alerts');
    formData.append('subject', subject);
    formData.append('message', message);
    formData.append('week', weekNumber);
    
    const response = await fetch(`${process.env.URL || 'https://your-site.netlify.app'}/?no-cache=1`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData.toString()
    });
    
    if (!response.ok) {
        throw new Error(`Form submission failed: ${response.status}`);
    }
}

// Premium option using SendGrid (requires API key)
async function sendEmailViaSendGrid(type, weekNumber, articleTimestamp, url) {
    const sgMail = require('@sendgrid/mail');
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    
    const msg = {
        to: process.env.ADMIN_EMAIL,
        from: process.env.FROM_EMAIL,
        subject: `🚨 Boone Rankings Update - Week ${weekNumber}`,
        text: `
Justin Boone has updated his Week ${weekNumber} fantasy football rankings!

Updated: ${new Date(articleTimestamp).toLocaleString()}
URL: ${url}

Time to update your rankings site!
        `,
        html: `
<h2>🚨 Justin Boone Rankings Update</h2>
<p><strong>Week ${weekNumber}</strong> rankings have been updated!</p>

<ul>
<li><strong>Updated:</strong> ${new Date(articleTimestamp).toLocaleString()}</li>
<li><strong>URL:</strong> <a href="${url}">${url}</a></li>
</ul>

<p><strong>⚡ Action needed:</strong> Time to update your rankings site!</p>
        `
    };
    
    await sgMail.send(msg);
}