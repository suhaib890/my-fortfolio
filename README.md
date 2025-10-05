# Portfolio Backend with Link Generation

A complete backend system for Suhaib Ashraf's portfolio website with dynamic link generation, contact form handling, and analytics.

## Features

- 🚀 **Express.js Backend** - Fast and reliable server
- 📧 **Contact Form Integration** - Email notifications and database storage
- 🔗 **Dynamic Link Generation** - Create trackable links for projects
- 📊 **Analytics Dashboard** - Track clicks and engagement
- 🛡️ **Security Features** - Rate limiting, CORS, and input validation
- 📱 **Admin Panel** - Manage links and view messages
- 🐳 **Docker Support** - Easy deployment with containers
- ☁️ **Multi-Platform Deployment** - Vercel, Netlify, and traditional hosting

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Setup

Copy the example environment file and configure your settings:

```bash
cp env.example .env
```

Edit `.env` with your configuration:

```env
# Server Configuration
PORT=3000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

# Email Configuration (for contact form notifications)
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
ADMIN_EMAIL=admin@yourdomain.com

# Database Configuration
DB_PATH=portfolio.db
```

### 3. Start Development Server

```bash
npm run dev
```

The server will start on `http://localhost:3000`

## API Endpoints

### Contact Form
- `POST /api/contact` - Submit contact form
- `GET /api/admin/messages` - Get all contact messages (admin)

### Link Generation
- `POST /api/generate-link` - Generate new project link
- `GET /api/redirect/:linkId` - Redirect to project
- `GET /api/analytics/:linkId` - Get link analytics
- `GET /api/admin/links` - Get all generated links (admin)

### System
- `GET /api/health` - Health check endpoint

## Admin Panel

Access the admin panel at `/admin.html` to:
- View overview statistics
- Manage generated links
- View contact messages
- Generate new project links

## Deployment Options

### 1. Traditional Hosting (VPS/Shared Hosting)

```bash
# Build and start
npm install --production
npm start
```

### 2. Docker Deployment

```bash
# Build and run with Docker
docker build -t portfolio-backend .
docker run -p 3000:3000 portfolio-backend

# Or use Docker Compose
docker-compose up -d
```

### 3. Vercel Deployment

1. Install Vercel CLI: `npm i -g vercel`
2. Run: `vercel`
3. Configure environment variables in Vercel dashboard

### 4. Netlify Deployment

1. Connect your GitHub repository to Netlify
2. Set build command: `npm install`
3. Set publish directory: `.`
4. Configure environment variables in Netlify dashboard

### 5. Railway Deployment

1. Connect your GitHub repository to Railway
2. Railway will automatically detect the Node.js app
3. Configure environment variables in Railway dashboard

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `PORT` | Server port | No (default: 3000) |
| `NODE_ENV` | Environment mode | No (default: development) |
| `FRONTEND_URL` | Frontend URL for CORS | No |
| `EMAIL_USER` | Gmail address for notifications | Yes |
| `EMAIL_PASS` | Gmail app password | Yes |
| `ADMIN_EMAIL` | Admin email for notifications | No |

## Database Schema

### Contact Messages
```sql
CREATE TABLE contact_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    subject TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    status TEXT DEFAULT 'unread'
);
```

### Generated Links
```sql
CREATE TABLE generated_links (
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
);
```

### Analytics
```sql
CREATE TABLE analytics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    link_id TEXT,
    ip_address TEXT,
    user_agent TEXT,
    referer TEXT,
    clicked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (link_id) REFERENCES generated_links (link_id)
);
```

## Usage Examples

### Generate a Project Link

```javascript
const response = await fetch('/api/generate-link', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
    },
    body: JSON.stringify({
        projectName: 'E-commerce Analysis',
        projectType: 'Data Analysis',
        originalUrl: 'https://github.com/username/project',
        description: 'Analysis of online retail data',
        expiresInDays: 30
    })
});

const result = await response.json();
console.log('Generated URL:', result.generatedUrl);
```

### Submit Contact Form

```javascript
const response = await fetch('/api/contact', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
    },
    body: JSON.stringify({
        name: 'John Doe',
        email: 'john@example.com',
        subject: 'Project Inquiry',
        message: 'I would like to discuss a potential project...'
    })
});
```

## Security Features

- **Rate Limiting**: 100 requests per 15 minutes per IP
- **CORS Protection**: Configurable origin restrictions
- **Input Validation**: Server-side validation for all inputs
- **Helmet.js**: Security headers
- **SQL Injection Protection**: Parameterized queries

## Monitoring and Analytics

- Track link clicks and user engagement
- Monitor contact form submissions
- View detailed analytics in admin panel
- Export data for further analysis

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For support, email suhaibashraf890@gmail.com or create an issue in the repository.

---

**Built with ❤️ by Suhaib Ashraf**
