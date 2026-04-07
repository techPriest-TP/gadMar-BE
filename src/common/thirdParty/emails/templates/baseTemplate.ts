/** @format */

export default function baseEmailTemplate(subject: string, message: string) {
    return `<!DOCTYPE html>
    <html>
    <head>
        <title>${subject} - Isuna</title>
    </head>
    <body style="background-color: #F4F4F7; margin: 0; padding: 0; font-family: Arial, sans-serif;">
        <table width="100%" cellspacing="0" cellpadding="0" border="0">
            <tr>
                <td align="center">
                    <table width="600" cellspacing="0" cellpadding="0" border="0" style="background-color: #ffffff; border-radius: 10px; box-shadow: 0px 4px 8px rgba(0, 0, 0, 0.2); margin: 20px;">
                        <tr>
                            <td style="padding: 20px;">
                            ${message}
                            </td>
                        </tr>
                        <tr>
                            <td align="center" style="padding: 20px;">
                                <p style="font-size: 12px; color: #999;">Copyright © ${new Date().getFullYear()} Isuna. All Rights Reserved.</p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
    `
}
