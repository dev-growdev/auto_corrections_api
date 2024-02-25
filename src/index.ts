import express, { Request, Response } from 'express';
import { Jobs } from './jobs';

const app = express();
app.use(express.json());

app.get('/', (_: Request, res: Response) =>
  res.send('Auto-Corrections-API is ON')
);

const port = process.env.PORT || 8081;

new Jobs().init();

app.listen(port, () => console.log('Server is running on port', port));
