# Auth Testing Playbook

## Step 1: MongoDB Verification
```bash
mongosh
use test_database
db.users.find({role: "admin"}).pretty()
db.users.findOne({role: "admin"}, {password_hash: 1})
```
Verify: bcrypt hash starts with `$2b$`, indexes exist on users.email (unique), login_attempts.identifier.

## Step 2: API Testing
```bash
# Login as admin
curl -c cookies.txt -X POST http://localhost:8001/api/v1/auth/login -H "Content-Type: application/json" -d '{"email":"admin@example.com","password":"admin123"}'

# Check cookies
cat cookies.txt

# Get me
curl -b cookies.txt http://localhost:8001/api/v1/auth/me

# Create a task
curl -b cookies.txt -X POST http://localhost:8001/api/v1/tasks -H "Content-Type: application/json" -d '{"title":"Test task","description":"A test","status":"todo","priority":"high"}'

# List tasks
curl -b cookies.txt http://localhost:8001/api/v1/tasks

# Get stats
curl -b cookies.txt http://localhost:8001/api/v1/stats

# Logout
curl -b cookies.txt -X POST http://localhost:8001/api/v1/auth/logout
```

## Step 3: Registration Flow
```bash
# Register new user
curl -c cookies2.txt -X POST http://localhost:8001/api/v1/auth/register -H "Content-Type: application/json" -d '{"name":"Test User","email":"testuser@example.com","password":"test123456"}'

# Check me
curl -b cookies2.txt http://localhost:8001/api/v1/auth/me
```

## Step 4: Role-Based Access
```bash
# Try admin endpoint with regular user (should fail)
curl -b cookies2.txt http://localhost:8001/api/v1/admin/users

# Try with admin cookies (should succeed)
curl -b cookies.txt http://localhost:8001/api/v1/admin/users
```

## Credentials
- Admin: admin@example.com / admin123
- Test User: testuser@example.com / test123456
