# WhatsApp Clone

A WhatsApp-like chat application built with Vue 3, Node.js, and MySQL.

## Features

- **Real-time messaging**: Send and receive messages instantly
- **Voice calls**: Make voice calls to contacts
- **Personal profile**: View and edit user profiles
- **Communities (Groups)**: Create and manage group chats
- **Media sharing**: Share images, videos, and documents
- **Online status**: See when contacts are online

## Tech Stack

- **Frontend**: Vue 3, Vue Router, Vuex
- **Backend**: Node.js, Express, Socket.IO
- **Database**: MySQL
- **Authentication**: JWT
- **Real-time communication**: WebSockets via Socket.IO

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd whatsapp-clone
```

2. Install server dependencies:
```bash
npm install
```

3. Navigate to the client directory and install dependencies:
```bash
cd client
npm install
```

4. Go back to the root directory:
```bash
cd ..
```

5. Set up the database:
```sql
-- Create the database and run the schema
CREATE DATABASE whatsapp_clone;
USE whatsapp_clone;
SOURCE server/db_schema.sql;
```

6. Create a `.env` file in the root directory:
```env
DB_HOST=localhost
DB_USER=your_db_username
DB_PASSWORD=your_db_password
DB_NAME=whatsapp_clone
JWT_SECRET=your_jwt_secret
PORT=5000
```

## Usage

1. Start the development servers:
```bash
npm run dev
```

2. The client will run on `http://localhost:3000`
3. The server will run on `http://localhost:5000`

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login a user
- `GET /api/auth/profile` - Get user profile

### Messages
- `GET /api/messages?userId=:userId` - Get messages for a user
- `POST /api/messages` - Send a new message

### Groups
- `GET /api/groups` - Get all groups
- `GET /api/groups/user/:userId` - Get groups for a user
- `POST /api/groups` - Create a new group
- `POST /api/groups/:groupId/users/:userId` - Add user to group
- `DELETE /api/groups/:groupId/users/:userId` - Remove user from group
- `GET /api/groups/:groupId/members` - Get group members

## Project Structure

```
whatsapp-clone/
├── client/                 # Vue 3 frontend
│   ├── src/
│   │   ├── components/     # Reusable components
│   │   ├── views/         # Page components
│   │   ├── store/         # Vuex store modules
│   │   ├── router/        # Vue Router configuration
│   │   └── assets/        # Static assets
├── server/                # Node.js backend
│   ├── models/            # Database models
│   ├── routes/            # API routes
│   ├── config/            # Configuration files
│   ├── utils/             # Utility functions
│   └── db_schema.sql      # Database schema
├── .env.example           # Environment variables example
└── README.md
```

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
DB_HOST=localhost
DB_USER=your_mysql_username
DB_PASSWORD=your_mysql_password
DB_NAME=whatsapp_clone
JWT_SECRET=your_jwt_secret_key
PORT=5000
```

## Database Schema

The application uses the following tables:

- `users`: Stores user information
- `groups`: Stores group information
- `group_members`: Links users to groups
- `messages`: Stores chat messages
- `user_sessions`: Tracks user sessions

## License

MIT