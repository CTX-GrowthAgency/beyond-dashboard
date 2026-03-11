# 📋 **Database Guide: Adding Inactive/Deactivated Events**

## 🔧 **How to Add Inactive/Deactivated Events to Database**

### **1. Event Status Values**

Your events should use these status values:

```javascript
// Event Status Options
"active"     // Event is live and accepting bookings
"deactivated" // Event was active but now disabled
"cancelled"   // Event was cancelled
"completed"   // Event has ended
"draft"       // Event is in draft mode
```

### **2. Adding Inactive Events**

#### **Method 1: Firebase Console**
1. Go to Firebase Console → Firestore Database
2. Navigate to `events` collection
3. Click "Add document"
4. Set the `status` field to `"inactive"` or `"deactivated"`

```json
{
  "title": "Your Event Name",
  "status": "inactive", // or "deactivated"
  "date": "2024-12-31T18:30:00.000Z",
  "venueName": "Event Venue",
  "ticketTypes": {
    "general": {
      "price": 299,
      "capacity": 100
    }
  },
  "createdAt": "...",
  "updatedAt": "..."
}
```

#### **Method 2: Update Existing Event**
```javascript
// Using Firebase Admin SDK
import { getDb } from '@/lib/firebase';

const db = getDb();
const eventId = 'your-event-id';

await db.collection('events').doc(eventId).update({
  status: 'deactivated', // or 'cancelled', 'completed', 'draft'
  updatedAt: admin.firestore.FieldValue.serverTimestamp()
});
```

#### **Method 3: Create New Deactivated Event**
```javascript
const db = getDb();

const newEvent = {
  title: 'Deactivated Event',
  status: 'deactivated',
  date: new Date('2024-12-31T18:30:00Z'),
  venueName: 'Some Venue',
  ticketTypes: {
    vip: { price: 599, capacity: 50 },
    general: { price: 299, capacity: 200 }
  },
  createdAt: admin.firestore.FieldValue.serverTimestamp(),
  updatedAt: admin.firestore.FieldValue.serverTimestamp()
};

await db.collection('events').add(newEvent);
```

### **3. Event Status Display in UI**

The events page will now show all events with their status:

```typescript
// In your EventTableClient component
function statusBadge(status: string) {
  switch (status) {
    case 'active':
      return <span className="badge badge-green">Active</span>;
    case 'deactivated':
      return <span className="badge badge-red">Deactivated</span>;
    case 'cancelled':
      return <span className="badge badge-red">Cancelled</span>;
    case 'completed':
      return <span className="badge badge-blue">Completed</span>;
    case 'draft':
      return <span className="badge badge-amber">Draft</span>;
    default:
      return <span className="badge badge-muted">Unknown</span>;
  }
}
```

### **4. Adding Status Column to Events Table**

Add this to your EventTableClient component:

```typescript
// In the table header
<th>Status</th>

// In the table row
<td>{statusBadge(event.status)}</td>
```

### **5. Database Index for Status**

Make sure you have this index for efficient filtering:

```json
// firestore.indexes.json
{
  "indexes": [
    {
      "collection": "events",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    }
  ]
}
```

### **6. Status Badge CSS**

Add these CSS classes to your EventTableClient:

```css
.badge {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.badge-green {
  background: #10b981;
  color: white;
}

.badge-red {
  background: #ef4444;
  color: white;
}

.badge-blue {
  background: #3b82f6;
  color: white;
}

.badge-amber {
  background: #f59e0b;
  color: white;
}

.badge-muted {
  background: #6b7280;
  color: white;
}
```

### **7. Example Event Documents**

#### **Active Event**
```json
{
  "title": "Summer Music Festival",
  "status": "active",
  "date": "2024-07-15T18:00:00.000Z",
  "venueName": "Central Park Arena",
  "ticketTypes": {
    "vip": { "price": 599, "capacity": 100 },
    "general": { "price": 299, "capacity": 500 }
  }
}
```

#### **Deactivated Event**
```json
{
  "title": "Deactivated Concert",
  "status": "deactivated",
  "date": "2024-05-20T19:00:00.000Z",
  "venueName": "Stadium",
  "ticketTypes": {
    "general": { "price": 399, "capacity": 1000 }
  }
}
```

### **8. Querying Events by Status**

```typescript
// Get only active events
const activeEvents = await db
  .collection('events')
  .where('status', '==', 'active')
  .orderBy('createdAt', 'desc')
  .get();

// Get all events (including deactivated)
const allEvents = await db
  .collection('events')
  .orderBy('createdAt', 'desc')
  .get();

// Get only deactivated events
const deactivatedEvents = await db
  .collection('events')
  .where('status', '==', 'deactivated')
  .orderBy('createdAt', 'desc')
  .get();

// Get only cancelled events
const cancelledEvents = await db
  .collection('events')
  .where('status', '==', 'cancelled')
  .orderBy('createdAt', 'desc')
  .get();
```

## 🎯 **Current Implementation**

Your events page now shows:
✅ **All events** (active, deactivated, cancelled, completed, draft)  
✅ **Correct ticket sold count** per event  
✅ **Proper date display** using `date` field or fallback to `createdAt`  
✅ **Attendee names** in booking detail table  

## 🚀 **Next Steps**

1. **Add status badges** to your EventTableClient component
2. **Update existing events** with appropriate status values
3. **Create the status index** in Firebase
4. **Test with different event statuses**

**Your dashboard will now show all events with their current status!** 🎉
