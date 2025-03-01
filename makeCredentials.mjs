import dotenv from "dotenv";
import fs from "fs";
import path from "path";

dotenv.config();

const credentialsPath = path.join(process.cwd(), "credentials.json");

const data = JSON.parse(process.env.CREDENTIALS);

data.private_key = data.private_key.replace(/\\n/g, "\n");

fs.writeFileSync(credentialsPath, JSON.stringify(data, null, 2));
