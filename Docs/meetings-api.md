# Meetings API

All routes require authentication via `requireAuth` and use JSON request bodies.

## List meetings by project
- **Method:** `GET`
- **Path:** `/api/projects/:projectId/meetings`
- **Response:** `{ "meetings": Meeting[] }`

## Create a meeting for a project
- **Method:** `POST`
- **Path:** `/api/projects/:projectId/meetings`
- **Body:** `CreateMeetingSchema` (projectId inferred from path)
- **Response:** `{ "meeting": Meeting }`

## Get a meeting by id
- **Method:** `GET`
- **Path:** `/api/meetings/:id`
- **Response:** `{ "meeting": Meeting }`

## Update a meeting
- **Method:** `PUT`
- **Path:** `/api/meetings/:id`
- **Body:** `UpdateMeetingSchema`
- **Response:** `{ "meeting": Meeting }`

## Delete a meeting
- **Method:** `DELETE`
- **Path:** `/api/meetings/:id`
- **Response:** HTTP 204

## Create a task from a meeting selection
- **Method:** `POST`
- **Path:** `/api/meetings/:id/tasks/from-selection`
- **Body:** `CreateTaskFromSelectionSchema` (includes `projectId`, `selectionText`, optional task fields)
- **Response:** `{ "task": Task }`
