#!/bin/bash
# Integration Verification Script
# Checks that frontend and backend are properly connected

echo "🚀 Starting integration verification..."
echo ""

# Check backend health
echo "📡 Checking backend health..."
BACKEND_RESPONSE=$(curl -s http://localhost:3000/health || echo "FAILED")
if [[ $BACKEND_RESPONSE == *"ok"* ]]; then
    echo "✅ Backend is running"
else
    echo "❌ Backend not responding. Start with: cd backend && npm run dev"
    exit 1
fi

echo ""
echo "🌐 Frontend build:"
cd frontend
npm run build > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✅ Frontend builds successfully"
else
    echo "❌ Frontend build failed"
    exit 1
fi

echo ""
echo "✨ Integration verification complete!"
echo ""
echo "To test the chat UI:"
echo "1. Terminal 1: cd backend && npm run dev"
echo "2. Terminal 2: cd frontend && npm run dev"  
echo "3. Open: http://localhost:5173"
echo ""
echo "Manual tests available in frontend/TESTING.md"
