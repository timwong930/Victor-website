const { Client } = require('@notionhq/client');

function pickBody(req) {
  if (!req.body) return {};
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }
  return req.body;
}

module.exports = async function (req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const NOTION_API_KEY = process.env.NOTION_API_KEY;
  const NOTION_DATABASE_ID = process.env.NOTION_DATABASE_ID;

  if (!NOTION_API_KEY || !NOTION_DATABASE_ID) {
    return res.status(500).json({
      error: 'Missing Vercel environment variables for Notion.'
    });
  }

  const notion = new Client({ auth: NOTION_API_KEY });
  const data = pickBody(req);

  try {
    const leadType = data.type === 'estimate' ? 'Estimate Request' : 'Website Lead';

    const properties = {
      Name: {
        title: [
          {
            text: {
              content: data.name || data.phone || 'Unknown Lead'
            }
          }
        ]
      },
      Phone: {
        rich_text: [
          {
            text: {
              content: data.phone || ''
            }
          }
        ]
      },
      Type: {
        select: {
          name: leadType
        }
      },
      Status: {
        select: {
          name: 'New'
        }
      }
    };

    if (data.location) {
      properties.Location = {
        rich_text: [{ text: { content: data.location } }]
      };
    }

    if (data.service) {
      properties.Service = {
        rich_text: [{ text: { content: data.service } }]
      };
    }

    if (data.message) {
      properties.Notes = {
        rich_text: [{ text: { content: data.message } }]
      };
    }

    const response = await notion.pages.create({
      parent: { database_id: NOTION_DATABASE_ID },
      properties
    });

    res.status(200).json({ success: true, url: response.url });
  } catch (error) {
    console.error('Notion API Error:', error);
    const message = error?.body ? JSON.parse(error.body)?.message : error?.message;
    res.status(500).json({
      error: message || 'Failed to create lead in Notion. Check server logs.'
    });
  }
};
