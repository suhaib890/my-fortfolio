// Demo data generator for testing dashboard
// Run this script to populate the database with sample data

const sqlite3 = require('sqlite3').verbose();
const { v4: uuidv4 } = require('uuid');

const db = new sqlite3.Database('portfolio.db', (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
    } else {
        console.log('Connected to SQLite database');
        generateDemoData();
    }
});

function generateDemoData() {
    console.log('Generating demo data...');
    
    // Sample project types
    const projectTypes = ['Data Analysis', 'Machine Learning', 'Web Development', 'Visualization', 'Research'];
    const projectNames = [
        'E-commerce Sales Analysis',
        'Customer Behavior Prediction',
        'Portfolio Website',
        'COVID-19 Data Visualization',
        'Stock Market Analysis',
        'Social Media Sentiment Analysis',
        'Weather Prediction Model',
        'E-learning Platform',
        'Sales Dashboard',
        'Predictive Maintenance System'
    ];
    
    // Generate sample links
    const links = [];
    for (let i = 0; i < 10; i++) {
        const linkId = uuidv4();
        const projectName = projectNames[i];
        const projectType = projectTypes[Math.floor(Math.random() * projectTypes.length)];
        const clickCount = Math.floor(Math.random() * 100) + 10;
        const createdDate = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000);
        
        links.push({
            link_id: linkId,
            project_name: projectName,
            project_type: projectType,
            original_url: `https://github.com/suhaib890/${projectName.toLowerCase().replace(/\s+/g, '-')}`,
            description: `A comprehensive ${projectType.toLowerCase()} project focusing on ${projectName.toLowerCase()}.`,
            created_at: createdDate.toISOString(),
            click_count: clickCount,
            is_active: Math.random() > 0.1
        });
    }
    
    // Insert links
    const linkStmt = db.prepare(`
        INSERT OR REPLACE INTO generated_links 
        (link_id, project_name, project_type, original_url, description, created_at, click_count, is_active)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    links.forEach(link => {
        linkStmt.run([
            link.link_id,
            link.project_name,
            link.project_type,
            link.original_url,
            link.description,
            link.created_at,
            link.click_count,
            link.is_active
        ]);
    });
    
    linkStmt.finalize();
    
    // Generate sample analytics data
    const analyticsStmt = db.prepare(`
        INSERT INTO analytics (link_id, ip_address, user_agent, referer, clicked_at)
        VALUES (?, ?, ?, ?, ?)
    `);
    
    const referrers = [
        'https://google.com',
        'https://linkedin.com',
        'https://github.com',
        'https://twitter.com',
        null, // Direct traffic
        'https://facebook.com',
        'https://reddit.com'
    ];
    
    const userAgents = [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
        'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15'
    ];
    
    // Generate clicks for each link
    links.forEach(link => {
        for (let i = 0; i < link.click_count; i++) {
            const clickDate = new Date(link.created_at);
            clickDate.setDate(clickDate.getDate() + Math.floor(Math.random() * 30));
            clickDate.setHours(Math.floor(Math.random() * 24));
            clickDate.setMinutes(Math.floor(Math.random() * 60));
            
            const ipAddress = `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
            const userAgent = userAgents[Math.floor(Math.random() * userAgents.length)];
            const referer = referrers[Math.floor(Math.random() * referrers.length)];
            
            analyticsStmt.run([
                link.link_id,
                ipAddress,
                userAgent,
                referer,
                clickDate.toISOString()
            ]);
        }
    });
    
    analyticsStmt.finalize();
    
    // Generate sample contact messages
    const contactStmt = db.prepare(`
        INSERT INTO contact_messages (name, email, subject, message, created_at)
        VALUES (?, ?, ?, ?, ?)
    `);
    
    const sampleMessages = [
        {
            name: 'John Smith',
            email: 'john.smith@email.com',
            subject: 'Data Analysis Project Inquiry',
            message: 'Hi Suhaib, I saw your portfolio and I\'m interested in discussing a data analysis project for my company. Could we schedule a call?'
        },
        {
            name: 'Sarah Johnson',
            email: 'sarah.j@company.com',
            subject: 'Machine Learning Collaboration',
            message: 'Hello! I\'m working on a machine learning project and would love to collaborate. Your COVID-19 visualization project caught my attention.'
        },
        {
            name: 'Mike Chen',
            email: 'mike.chen@startup.io',
            subject: 'Web Development Opportunity',
            message: 'Hi there! We\'re a startup looking for a web developer. Your portfolio website looks amazing. Are you available for freelance work?'
        },
        {
            name: 'Emily Davis',
            email: 'emily.davis@university.edu',
            subject: 'Research Collaboration',
            message: 'Dear Suhaib, I\'m a PhD student working on predictive analytics. Would you be interested in collaborating on a research paper?'
        },
        {
            name: 'Alex Rodriguez',
            email: 'alex.r@consulting.com',
            subject: 'Consulting Opportunity',
            message: 'Hi Suhaib, I represent a consulting firm looking for data analysts. Your skills align perfectly with our needs. Let\'s talk!'
        }
    ];
    
    sampleMessages.forEach((msg, index) => {
        const messageDate = new Date(Date.now() - Math.random() * 14 * 24 * 60 * 60 * 1000);
        contactStmt.run([
            msg.name,
            msg.email,
            msg.subject,
            msg.message,
            messageDate.toISOString()
        ]);
    });
    
    contactStmt.finalize();
    
    console.log('Demo data generated successfully!');
    console.log('- 10 sample project links');
    console.log('- Analytics data for each link');
    console.log('- 5 sample contact messages');
    console.log('\nYou can now view the dashboard at http://localhost:3000/dashboard.html');
    
    db.close();
}

// Run if called directly
if (require.main === module) {
    generateDemoData();
}

module.exports = { generateDemoData };
