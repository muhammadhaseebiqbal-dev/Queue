import mongoose from 'mongoose';

export let isConnected = false;

// Connect to MongoDB
export const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/queuebot', {
            serverSelectionTimeoutMS: 5000 // Fail fast if no DB
        });
        isConnected = true;
        console.log(`[MongoDB] Connected: ${conn.connection.host}`);
    } catch (error) {
        isConnected = false;
        console.error(`[MongoDB] Error: ${error.message} (Continuing with in-memory mode)`);
        // process.exit(1); // Don't crash if DB is missing
    }
};

// --- Schemas ---

// User Schema
const userSchema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true, index: true }, // Firebase UID or generated ID
    email: { type: String, required: true, unique: true },
    displayName: { type: String },
    photoURL: { type: String },
    authProvider: { type: String, enum: ['google', 'email'], default: 'email' },
    isVerified: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
    lastLogin: { type: Date, default: Date.now }
});

// Magic Link Token Schema
const magicLinkTokenSchema = new mongoose.Schema({
    email: { type: String, required: true },
    token: { type: String, required: true }, // Should be hashed in production
    expiresAt: { type: Date, required: true, default: () => new Date(+new Date() + 15 * 60 * 1000), expires: 0 } // Auto-delete when this time is reached
});

// Project Schema (Folders)
const projectSchema = new mongoose.Schema({
    userId: { type: String, required: true, index: true }, // We'll use a simple string ID for now (or auth ID later)
    name: { type: String, required: true },
    description: { type: String, default: '' },
    color: { type: String, default: '#6366f1' },
    emoji: { type: String, default: '📁' },
    isArchived: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

// Chat Session Schema (The conversation metadata)
const sessionSchema = new mongoose.Schema({
    userId: { type: String, required: true, index: true },
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', default: null },
    title: { type: String, default: 'New Chat' },
    preview: { type: String, default: '' }, // Last message preview
    model: { type: String, default: 'llama-3.3-70b' },
    isArchived: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

// Message Schema (Individual messages in a session)
const messageSchema = new mongoose.Schema({
    sessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Session', required: true, index: true },
    role: { type: String, required: true, enum: ['user', 'assistant', 'system'] },
    content: { type: String, required: true },
    // Metadata for rich features
    type: { type: String, default: 'text' }, // 'text', 'image_generated'
    generatedImage: {
        prompt: String,
        url: String,
        provider: String
    },
    hiddenContent: { type: String }, // For file context
    attachments: [{
        name: String,
        type: { type: String }, // Fix: Escape reserved 'type' keyword
        size: Number,
        content: String // Base64 or URL
    }],
    // Singular attachment field (used by current frontend)
    attachment: {
        name: String,
        type: { type: String }, // Fix: Escape reserved 'type' keyword
        content: String // Base64 or URL
    },
    feedback: { type: String, enum: ['like', 'dislike', null], default: null },
    searchResults: [{ title: String, link: String, snippet: String }],
    weatherData: { type: Object },
    timestamp: { type: Date, default: Date.now }
});

// Models
export const User = mongoose.models.User || mongoose.model('User', userSchema);
export const Project = mongoose.models.Project || mongoose.model('Project', projectSchema);
export const Session = mongoose.models.Session || mongoose.model('Session', sessionSchema);
export const Message = mongoose.models.Message || mongoose.model('Message', messageSchema);
export const MagicLinkToken = mongoose.models.MagicLinkToken || mongoose.model('MagicLinkToken', magicLinkTokenSchema);

