const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const { v4: uuidv4 } = require('uuid');
const nodemailer = require('nodemailer');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());
app.use(cors({
    origin: process.env.FRONTEND_URL || '*',
    credentials: true
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Body parsing middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files
app.use(express.static('.'));

// Database setup
const db = new sqlite3.Database('portfolio.db', (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
    } else {
        console.log('Connected to SQLite database');
        initializeDatabase();
    }
});

// Initialize database tables
function initializeDatabase() {
    // Contact messages table
    db.run(`CREATE TABLE IF NOT EXISTS contact_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        subject TEXT NOT NULL,
        message TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        status TEXT DEFAULT 'unread'
    )`);

    // Generated links table
    db.run(`CREATE TABLE IF NOT EXISTS generated_links (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        link_id TEXT UNIQUE NOT NULL,
        project_name TEXT NOT NULL,
        project_type TEXT NOT NULL,
        original_url TEXT,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        expires_at DATETIME,
        is_active BOOLEAN DEFAULT 1,
        click_count INTEGER DEFAULT 0
    )`);

    // Analytics table
    db.run(`CREATE TABLE IF NOT EXISTS analytics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        link_id TEXT,
        ip_address TEXT,
        user_agent TEXT,
        referer TEXT,
        clicked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (link_id) REFERENCES generated_links (link_id)
    )`);
}

// Email configuration
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// API Routes

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Contact form submission
app.post('/api/contact', async (req, res) => {
    try {
        const { name, email, subject, message } = req.body;

        // Validation
        if (!name || !email || !subject || !message) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        // Store in database
        const stmt = db.prepare(`
            INSERT INTO contact_messages (name, email, subject, message)
            VALUES (?, ?, ?, ?)
        `);
        
        stmt.run([name, email, subject, message], function(err) {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({ error: 'Failed to save message' });
            }

            // Send email notification
            const mailOptions = {
                from: process.env.EMAIL_USER,
                to: process.env.ADMIN_EMAIL || email,
                subject: `Portfolio Contact: ${subject}`,
                html: `
                    <h3>New Contact Form Submission</h3>
                    <p><strong>Name:</strong> ${name}</p>
                    <p><strong>Email:</strong> ${email}</p>
                    <p><strong>Subject:</strong> ${subject}</p>
                    <p><strong>Message:</strong></p>
                    <p>${message.replace(/\n/g, '<br>')}</p>
                `
            };

            transporter.sendMail(mailOptions, (error, info) => {
                if (error) {
                    console.error('Email error:', error);
                } else {
                    console.log('Email sent:', info.response);
                }
            });

            res.json({ 
                success: true, 
                message: 'Message sent successfully!',
                id: this.lastID 
            });
        });

        stmt.finalize();
    } catch (error) {
        console.error('Contact form error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Generate project link
app.post('/api/generate-link', (req, res) => {
    try {
        const { projectName, projectType, originalUrl, description, expiresInDays } = req.body;

        if (!projectName || !projectType) {
            return res.status(400).json({ error: 'Project name and type are required' });
        }

        const linkId = uuidv4();
        const expiresAt = expiresInDays ? 
            new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000) : 
            null;

        const stmt = db.prepare(`
            INSERT INTO generated_links (link_id, project_name, project_type, original_url, description, expires_at)
            VALUES (?, ?, ?, ?, ?, ?)
        `);

        stmt.run([linkId, projectName, projectType, originalUrl, description, expiresAt], function(err) {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({ error: 'Failed to generate link' });
            }

            const generatedUrl = `${req.protocol}://${req.get('host')}/api/redirect/${linkId}`;
            
            res.json({
                success: true,
                linkId: linkId,
                generatedUrl: generatedUrl,
                expiresAt: expiresAt,
                message: 'Link generated successfully'
            });
        });

        stmt.finalize();
    } catch (error) {
        console.error('Link generation error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Redirect generated link
app.get('/api/redirect/:linkId', (req, res) => {
    const { linkId } = req.params;

    db.get(`
        SELECT * FROM generated_links 
        WHERE link_id = ? AND is_active = 1 
        AND (expires_at IS NULL OR expires_at > datetime('now'))
    `, [linkId], (err, row) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).send('Internal server error');
        }

        if (!row) {
            return res.status(404).send(`
                <html>
                    <head><title>Link Not Found</title></head>
                    <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
                        <h1>Link Not Found or Expired</h1>
                        <p>This link may have expired or doesn't exist.</p>
                        <a href="/portfolio.html">Return to Portfolio</a>
                    </body>
                </html>
            `);
        }

        // Record analytics
        const analyticsStmt = db.prepare(`
            INSERT INTO analytics (link_id, ip_address, user_agent, referer)
            VALUES (?, ?, ?, ?)
        `);
        analyticsStmt.run([linkId, req.ip, req.get('User-Agent'), req.get('Referer')]);
        analyticsStmt.finalize();

        // Update click count
        db.run('UPDATE generated_links SET click_count = click_count + 1 WHERE link_id = ?', [linkId]);

        // Redirect to original URL or show project page
        if (row.original_url) {
            res.redirect(row.original_url);
        } else {
            res.send(`
                <html>
                    <head>
                        <title>${row.project_name}</title>
                        <style>
                            body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
                            .project-header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px; margin-bottom: 20px; }
                            .project-content { background: #f8f9fa; padding: 20px; border-radius: 10px; }
                        </style>
                    </head>
                    <body>
                        <div class="project-header">
                            <h1>${row.project_name}</h1>
                            <p>Project Type: ${row.project_type}</p>
                        </div>
                        <div class="project-content">
                            <p>${row.description || 'No description available.'}</p>
                            <p><strong>Generated:</strong> ${new Date(row.created_at).toLocaleDateString()}</p>
                            <p><strong>Clicks:</strong> ${row.click_count + 1}</p>
                        </div>
                        <a href="/portfolio.html">← Back to Portfolio</a>
                    </body>
                </html>
            `);
        }
    });
});

// Get analytics for a link
app.get('/api/analytics/:linkId', (req, res) => {
    const { linkId } = req.params;

    db.get(`
        SELECT gl.*, COUNT(a.id) as total_clicks
        FROM generated_links gl
        LEFT JOIN analytics a ON gl.link_id = a.link_id
        WHERE gl.link_id = ?
        GROUP BY gl.link_id
    `, [linkId], (err, row) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Database error' });
        }

        if (!row) {
            return res.status(404).json({ error: 'Link not found' });
        }

        res.json({
            linkId: row.link_id,
            projectName: row.project_name,
            projectType: row.project_type,
            totalClicks: row.total_clicks,
            createdAt: row.created_at,
            expiresAt: row.expires_at,
            isActive: row.is_active
        });
    });
});

// Get all generated links (admin endpoint)
app.get('/api/admin/links', (req, res) => {
    db.all(`
        SELECT gl.*, COUNT(a.id) as total_clicks
        FROM generated_links gl
        LEFT JOIN analytics a ON gl.link_id = a.link_id
        GROUP BY gl.link_id
        ORDER BY gl.created_at DESC
    `, (err, rows) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Database error' });
        }

        res.json(rows);
    });
});

// Get contact messages (admin endpoint)
app.get('/api/admin/messages', (req, res) => {
    db.all(`
        SELECT * FROM contact_messages 
        ORDER BY created_at DESC
    `, (err, rows) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Database error' });
        }

        res.json(rows);
    });
});

// Dashboard analytics endpoint
app.get('/api/dashboard/analytics', (req, res) => {
    const analytics = {};
    
    // Get click trends for the last 30 days
    db.all(`
        SELECT DATE(clicked_at) as date, COUNT(*) as clicks
        FROM analytics 
        WHERE clicked_at >= date('now', '-30 days')
        GROUP BY DATE(clicked_at)
        ORDER BY date
    `, (err, clickTrends) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        
        analytics.clickTrends = clickTrends;
        
        // Get project type distribution
        db.all(`
            SELECT project_type, COUNT(*) as count, SUM(click_count) as total_clicks
            FROM generated_links
            GROUP BY project_type
            ORDER BY total_clicks DESC
        `, (err, projectTypes) => {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({ error: 'Database error' });
            }
            
            analytics.projectTypes = projectTypes;
            
            // Get top performing links
            db.all(`
                SELECT project_name, project_type, click_count, created_at
                FROM generated_links
                WHERE is_active = 1
                ORDER BY click_count DESC
                LIMIT 10
            `, (err, topLinks) => {
                if (err) {
                    console.error('Database error:', err);
                    return res.status(500).json({ error: 'Database error' });
                }
                
                analytics.topLinks = topLinks;
                
                // Get engagement metrics
                db.get(`
                    SELECT 
                        COUNT(*) as total_links,
                        SUM(click_count) as total_clicks,
                        AVG(click_count) as avg_clicks,
                        COUNT(CASE WHEN is_active = 1 THEN 1 END) as active_links
                    FROM generated_links
                `, (err, engagement) => {
                    if (err) {
                        console.error('Database error:', err);
                        return res.status(500).json({ error: 'Database error' });
                    }
                    
                    analytics.engagement = engagement;
                    
                    // Get recent activity
                    db.all(`
                        SELECT 
                            'link_click' as type,
                            gl.project_name as description,
                            a.clicked_at as timestamp,
                            a.ip_address
                        FROM analytics a
                        JOIN generated_links gl ON a.link_id = gl.link_id
                        WHERE a.clicked_at >= date('now', '-7 days')
                        
                        UNION ALL
                        
                        SELECT 
                            'message' as type,
                            'New message from ' || name as description,
                            created_at as timestamp,
                            email as ip_address
                        FROM contact_messages
                        WHERE created_at >= date('now', '-7 days')
                        
                        ORDER BY timestamp DESC
                        LIMIT 20
                    `, (err, recentActivity) => {
                        if (err) {
                            console.error('Database error:', err);
                            return res.status(500).json({ error: 'Database error' });
                        }
                        
                        analytics.recentActivity = recentActivity;
                        res.json(analytics);
                    });
                });
            });
        });
    });
});

// Get detailed analytics for a specific link
app.get('/api/analytics/detailed/:linkId', (req, res) => {
    const { linkId } = req.params;
    
    // Get link details
    db.get(`
        SELECT * FROM generated_links WHERE link_id = ?
    `, [linkId], (err, link) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        
        if (!link) {
            return res.status(404).json({ error: 'Link not found' });
        }
        
        // Get click analytics
        db.all(`
            SELECT 
                DATE(clicked_at) as date,
                COUNT(*) as clicks,
                COUNT(DISTINCT ip_address) as unique_visitors
            FROM analytics 
            WHERE link_id = ?
            GROUP BY DATE(clicked_at)
            ORDER BY date DESC
            LIMIT 30
        `, [linkId], (err, clickAnalytics) => {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({ error: 'Database error' });
            }
            
            // Get referrer data
            db.all(`
                SELECT 
                    referer,
                    COUNT(*) as count
                FROM analytics 
                WHERE link_id = ? AND referer IS NOT NULL
                GROUP BY referer
                ORDER BY count DESC
                LIMIT 10
            `, [linkId], (err, referrers) => {
                if (err) {
                    console.error('Database error:', err);
                    return res.status(500).json({ error: 'Database error' });
                }
                
                res.json({
                    link,
                    clickAnalytics,
                    referrers
                });
            });
        });
    });
});

// Serve main portfolio page
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Portfolio backend server running on port ${PORT}`);
    console.log(`📊 Admin panel: http://localhost:${PORT}/admin.html`);
    console.log(`🔗 API endpoints: http://localhost:${PORT}/api/`);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down server...');
    db.close((err) => {
        if (err) {
            console.error('Error closing database:', err.message);
        } else {
            console.log('✅ Database connection closed');
        }
        process.exit(0);
    });
});
