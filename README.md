# Beyond Dashboard

A comprehensive internal booking management dashboard for Beyond events. This Next.js application provides administrative tools for managing event bookings, user data, and event inventory with Firebase integration.

## 🚀 Features

- **Authentication System**: Secure cookie-based authentication for admin access
- **Booking Management**: View, manage, and track event bookings in real-time
- **Event Management**: Monitor events, ticket inventory, and revenue analytics
- **User Management**: Access user details and booking history
- **Export Functionality**: Export booking data to CSV for analysis
- **Email Notifications**: Resend confirmation emails to customers
- **Responsive Design**: Modern UI built with Tailwind CSS
- **Real-time Updates**: Live data synchronization with Firebase

## 🛠 Tech Stack

- **Framework**: Next.js 16.1.6 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **Database**: Firebase Firestore (Admin SDK)
- **Authentication**: Custom cookie-based auth system
- **Deployment**: Vercel (recommended)

## 📁 Project Structure

```
beyond-dashboard/
├── app/                          # Next.js App Router pages
│   ├── api/                      # API routes
│   │   ├── actions/              # Booking action endpoints
│   │   │   ├── cancle/           # Cancel booking API
│   │   │   ├── export-csv/       # CSV export API
│   │   │   └── resend-email/     # Email resend API
│   │   ├── auth/                 # Authentication endpoints
│   │   ├── booking/              # Booking-specific APIs
│   │   └── events/               # Event management APIs
│   ├── bookings/                 # Booking management pages
│   │   ├── [bookingId]/          # Dynamic booking detail pages
│   │   ├── layout.tsx            # Booking layout wrapper
│   │   └── page.tsx              # Main bookings listing
│   ├── events/                   # Event management pages
│   ├── login/                    # Authentication page
│   ├── globals.css               # Global styles
│   ├── layout.tsx                # Root layout component
│   └── page.tsx                  # Home page (redirects to bookings)
├── components/                   # Reusable React components
│   ├── BookingDetails.tsx        # Booking detail component
│   ├── BookingTable.tsx          # Bookings data table
│   ├── EventTableClient.tsx      # Events data table (client-side)
│   └── SideBar.tsx               # Navigation sidebar
├── lib/                          # Utility libraries
│   ├── auth.ts                   # Authentication utilities
│   └── firebase.ts               # Firebase admin configuration
├── public/                       # Static assets
├── types/                        # TypeScript type definitions
│   └── index.ts                  # Core data models
├── .env.local                    # Environment variables (git-ignored)
├── .gitignore                    # Git ignore rules
├── eslint.config.mjs             # ESLint configuration
├── next.config.ts                # Next.js configuration
├── package.json                  # Dependencies and scripts
├── postcss.config.mjs            # PostCSS configuration
├── tailwind.config.ts            # Tailwind CSS configuration
└── tsconfig.json                 # TypeScript configuration
```

## 🗄️ Data Models

### Booking Document
```typescript
interface BookingDoc {
  bookingId: string;
  userId: string;
  uid: string;
  eventId: string;
  eventSlug: string;
  tickets: TicketLine[];
  pricing: Pricing;
  cashfreeOrderId?: string;
  paymentReference?: string;
  paymentMethod?: string;
  paymentStatus: "pending" | "completed" | "failed";
  ticketStatus: "pending" | "confirmed" | "cancelled";
  createdAt: Timestamp;
  expiresAt?: Timestamp;
  paidAt?: Timestamp;
  verifiedAt?: Timestamp;
  notificationSentAt?: Timestamp;
}
```

### Event Document
```typescript
interface EventDoc {
  id: string;
  title: string;
  date: Timestamp;
  venueName: string;
  status: "active" | "inactive";
  ticketTypes: Record<string, TicketTypeInventory>;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### User Document
```typescript
interface UserDoc {
  name: string;
  email: string;
  phone: string;
  nationality?: string;
  state?: string;
  createdAt: Timestamp;
}
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- npm, yarn, pnpm, or bun
- Firebase project with Admin SDK configured

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd beyond-dashboard
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   # or
   pnpm install
   # or
   bun install
   ```

3. **Environment Setup**
   
   Create a `.env.local` file in the root directory:
   
   ```env
   # Firebase Admin Configuration
   FIREBASE_PROJECT_ID=your-project-id
   FIREBASE_CLIENT_EMAIL=your-service-account-email@your-project.iam.gserviceaccount.com
   FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
   
   # Dashboard Authentication
   DASHBOARD_SECRET=your-secure-secret-key
   ```

4. **Firebase Service Account**
   
   - Go to Firebase Console → Project Settings → Service Accounts
   - Generate a new private key
   - Copy the contents to your `.env.local` file
   - Ensure the private key is properly formatted with `\n` line breaks

5. **Run the development server**
   ```bash
   npm run dev
   # or
   yarn dev
   # or
   pnpm dev
   # or
   bun dev
   ```

6. **Open your browser**
   
   Navigate to [http://localhost:3000](http://localhost:3000)

## 🔐 Authentication

The dashboard uses a simple cookie-based authentication system:

- **Session Cookie**: `bd_session`
- **Session Value**: Configured via `DASHBOARD_SECRET` environment variable
- **Protection**: All routes except `/login` require authentication
- **Usage**: Call `requireAuth()` at the top of server components to protect pages

## 📊 Available Routes

### Public Routes
- `/` - Redirects to bookings (if authenticated) or login
- `/login` - Authentication page

### Protected Routes
- `/bookings` - Main bookings listing and management
- `/bookings/[bookingId]` - Individual booking details
- `/events` - Event management and analytics

### API Routes
- `GET /api/events` - Fetch all events with statistics
- `GET /api/booking` - Fetch bookings with filtering and pagination
- `POST /api/actions/cancle` - Cancel a booking
- `POST /api/actions/export-csv` - Export bookings to CSV
- `POST /api/actions/resend-email` - Resend confirmation email
- `POST /api/auth/login` - Authenticate admin user

## 🎯 Key Features in Detail

### Booking Management
- **View All Bookings**: Comprehensive table with filtering and sorting
- **Booking Details**: Detailed view of individual bookings including user info
- **Status Management**: Update payment and ticket statuses
- **Cancellation**: Cancel bookings with proper status updates

### Event Analytics
- **Revenue Tracking**: Monitor total and per-event revenue
- **Ticket Sales**: Track ticket sales by type and event
- **Booking Statistics**: View confirmed, pending, and failed bookings
- **Event Management**: Activate/deactivate events, manage ticket inventory

### Data Export
- **CSV Export**: Export filtered booking data for external analysis
- **Custom Filters**: Export specific date ranges, events, or statuses
- **Complete Data**: Include all relevant booking and user information

### Email Communications
- **Resend Confirmations**: Trigger email resend for specific bookings
- **Notification Tracking**: Monitor email delivery status
- **Customer Support**: Quick access to resend capabilities for support

## 🔧 Development

### Scripts
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

### Code Style
- **TypeScript**: Strict type checking enabled
- **ESLint**: Next.js recommended configuration
- **Prettier**: Configured for consistent formatting (if added)

### Firebase Integration
- **Admin SDK**: Server-side Firebase operations
- **Firestore**: NoSQL database for bookings, events, and users
- **Security**: Service account authentication for admin operations

## 🚀 Deployment

### Vercel (Recommended)
1. Connect your GitHub repository to Vercel
2. Configure environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Manual Deployment
1. Build the application: `npm run build`
2. Start production server: `npm run start`
3. Configure reverse proxy (nginx/Apache) if needed

### Environment Variables for Production
Ensure all required environment variables are set in your hosting environment:
- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`
- `DASHBOARD_SECRET`

## 🔒 Security Considerations

- **Environment Variables**: Never commit `.env.local` to version control
- **Firebase Keys**: Keep service account keys secure and rotate regularly
- **Dashboard Secret**: Use a strong, unique secret for authentication
- **HTTPS**: Always use HTTPS in production
- **CORS**: Configure proper CORS rules if needed

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make changes and test thoroughly
4. Commit changes: `git commit -m 'Add feature'`
5. Push to branch: `git push origin feature-name`
6. Submit a pull request

## 📝 License

This project is proprietary and confidential to Beyond Events.

## 🆘 Support

For technical support or questions:
- Contact the development team
- Check Firebase documentation for Admin SDK issues
- Review Next.js documentation for framework questions

## 🔄 Version History

- **v0.1.0** - Initial release with core booking management features
  - Authentication system
  - Booking management interface
  - Event analytics
  - CSV export functionality
  - Email resend capabilities
