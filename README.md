# Commands needed to run everything

### `npm install`

To install all relevant packages for this project

### `npm start`

Start React in development mode

Runs on [http://localhost:3000](http://localhost:3000) 

## Chose 1 of the folowing servers: 

### ` npx ts-node server.ts`

Starts Express NodeJs server
Has to be started from /src folder

Runs on [http://localhost:4000](http://localhost:4000) 

Has only @post /check-books route

### `uvicorn serverPy:app --host localhost --port 4000 --reload`

Starts Python FastAPI server
Has to be started from /src folder

Runs on [http://localhost:4000](http://localhost:4000) 

Has only @post /check-books route
