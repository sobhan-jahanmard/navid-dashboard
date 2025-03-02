import { google } from "googleapis";
import path from "path";

// Initialize the Google Sheets API
const SCOPES = ["https://www.googleapis.com/auth/spreadsheets"];

const credentialsPath = path.join(process.cwd(), "credentials.json");

// Google Sheet ID
const SPREADSHEET_ID = "14xL_J_I1alAEnmPHJsOvSFArUtU7MreEwu5tL8RSyUk";

type Auth = Parameters<(typeof google)["sheets"]>["0"]["auth"];

// Initialize auth
async function getAuthClient() {
  try {
    const auth = new google.auth.GoogleAuth({
      keyFile: credentialsPath,
      scopes: SCOPES,
    });
    return auth.getClient();
  } catch (error) {
    console.error("Error initializing Google Sheets auth:", error);
    throw new Error("Failed to initialize Google Sheets API");
  }
}

// Initialize sheets client
async function getSheetsClient() {
  const authClient = await getAuthClient();
  return google.sheets({
    version: "v4",
    auth: authClient as Auth, // Specify the correct type
  });
}

// Fetch seller info by Discord ID
export async function getSellerInfoByDiscordId(discordId: string) {
  try {
    const sheets = await getSheetsClient();

    // Fetch seller info from the Seller Info sheet
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: "Seller Info!A:E", // A = Discord ID, B = Card Number, C = IBAN, D = Name on Card, E = Phone Number
    });

    const rows = response.data.values || [];

    // Skip header row if exists
    const startRow = rows.length > 0 && rows[0][0] === "Discord ID" ? 1 : 0;

    // Find seller by Discord ID
    for (let i = startRow; i < rows.length; i++) {
      if (rows[i] && rows[i][0] === discordId) {
        return {
          discordId: rows[i][0] || "",
          cardNumber: rows[i][1] || "",
          iban: rows[i][2] || "",
          nameOnCard: rows[i][3] || "",
          phoneNumber: rows[i][4] || "",
          found: true,
        };
      }
    }

    return {
      discordId,
      found: false,
    };
  } catch (error) {
    console.error("Error fetching seller info from Google Sheets:", error);
    throw new Error("Failed to fetch seller information");
  }
}

// Add or update seller information in the Seller Info sheet
export async function addOrUpdateSellerInfo(sellerInfo: {
  discordId: string;
  cardNumber: string;
  iban: string;
  nameOnCard: string;
  phoneNumber: string;
}) {
  try {
    const sheets = await getSheetsClient();

    // First check if the seller already exists
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: "Seller Info!A:A", // Just get Discord IDs column
    });

    const rows = response.data.values || [];
    let rowIndex = -1;

    // Skip header row if exists
    const startRow = rows.length > 0 && rows[0][0] === "Discord ID" ? 1 : 0;

    // Find row with matching Discord ID
    for (let i = startRow; i < rows.length; i++) {
      if (rows[i] && rows[i][0] === sellerInfo.discordId) {
        rowIndex = i + 1; // Sheets rows are 1-indexed
        break;
      }
    }

    if (rowIndex === -1) {
      // Seller doesn't exist, add new row
      await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: "Seller Info!A:E",
        valueInputOption: "USER_ENTERED",
        requestBody: {
          values: [
            [
              sellerInfo.discordId,
              sellerInfo.cardNumber,
              sellerInfo.iban,
              sellerInfo.nameOnCard,
              sellerInfo.phoneNumber,
            ],
          ],
        },
      });

      return { success: true, action: "added" };
    } else {
      // Seller exists, update the row
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `Seller Info!A${rowIndex}:E${rowIndex}`,
        valueInputOption: "USER_ENTERED",
        requestBody: {
          values: [
            [
              sellerInfo.discordId,
              sellerInfo.cardNumber,
              sellerInfo.iban,
              sellerInfo.nameOnCard,
              sellerInfo.phoneNumber,
            ],
          ],
        },
      });

      return { success: true, action: "updated" };
    }
  } catch (error) {
    console.error("Error updating seller info in Google Sheets:", error);
    throw new Error("Failed to update seller information");
  }
}

// Authenticate user against Google Sheets
export async function authenticateUser(username: string, password: string) {
  try {
    const sheets = await getSheetsClient();

    // Fetch users from the Users sheet
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: "Users!A:B", // A = Username, B = Password
    });

    const rows = response.data.values || [];

    // Skip header row if exists
    const startRow = rows.length > 0 && rows[0][0] === "Username" ? 1 : 0;

    // Find user by username
    for (let i = startRow; i < rows.length; i++) {
      const [rowUsername, rowPassword] = rows[i];

      if (rowUsername === username) {
        // Simple password comparison (passwords are stored in plain text in the sheet)
        if (rowPassword === password) {
          // Return user data (username only in this case)
          return {
            id: String(i), // Use row index as ID
            name: username,
            username,
            role: username.toLowerCase() === "admin" ? "ADMIN" : "USER",
          };
        }
        break; // Username found but password didn't match
      }
    }

    return null; // User not found or password didn't match
  } catch (error) {
    console.error("Error authenticating user with Google Sheets:", error);
    return null;
  }
}

// Add a payment to Google Sheets
export async function addPayment(payment: {
  id: string;
  amount: string | number;
  price: string | number;
  totalRial: string | number;
  user: string;
  discordId: string;
  cardNumber: string;
  iban: string;
  nameOnCard: string;
  phoneNumber: string;
  paymentDuration: string;
  game: string;
  note?: string;
  status?: string;
  date?: string;
}) {
  try {
    const sheets = await getSheetsClient();

    // Ensure default values
    const status = payment.status || "Pending";
    // Use current date for timestamp
    const date = new Date().toISOString();

    const row = [
      payment.id,
      payment.amount,
      payment.price,
      payment.totalRial,
      payment.user,
      date, // Current date
      payment.discordId,
      payment.cardNumber,
      payment.iban,
      payment.nameOnCard,
      payment.phoneNumber,
      payment.paymentDuration,
      payment.game,
      payment.note || "",
      status,
    ];

    const response = await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: "Payment!A1",
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [row],
      },
    });

    if (response.status !== 200) {
      throw new Error("Failed to add payment");
    }

    return { success: true };
  } catch (error) {
    console.error("Error adding payment:", error);
    throw error;
  }
}

// Get all payments from Google Sheets
export async function getPayments() {
  try {
    const sheets = await getSheetsClient();

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: "Payment!A:Q", // Updated range to include all 16 columns
    });

    const rows = response.data.values;

    if (!rows || rows.length === 0) {
      console.log("No data found in the Payment sheet.");
      return [];
    }

    console.log("Raw data from sheet:", rows);

    // Check if the first row is a header or data
    const hasHeaderRow =
      rows.length > 1 &&
      (rows[0][0] === "ID" ||
        rows[0][0] === "id" ||
        (typeof rows[0][0] === "string" && rows[0][0].toLowerCase() === "id"));

    // If there's a header row, skip it with slice(1), otherwise process all rows
    const dataRows = hasHeaderRow ? rows.slice(1) : rows;

    console.log(
      `Processing ${dataRows.length} data rows (hasHeaderRow: ${hasHeaderRow})`
    );

    return dataRows.map((row) => {
      // Ensure the row has enough elements
      if (row.length < 17) {
        while (row.length < 17) {
          row.push("");
        }
      }

      // Map each row to a payment object according to the new indices
      const status = row[14] || "Pending";
      const isPaid = status === "Paid";

      return {
        id: row[0],
        amount: row[1],
        price: row[2],
        finalAmount: row[3], // New field
        user: row[4],
        submitDate: row[5], // Renamed from timestamp
        timestamp: row[5], // For backward compatibility
        discordId: row[6],
        cardNumber: row[7],
        iban: row[8],
        nameOnCard: row[9], // Renamed to match field
        phoneNumber: row[10], // Renamed to match field
        paymentDuration: row[11],
        game: row[12],
        note: row[13],
        status: status,
        whoPaidCancelled: row[15] || "", // New field for who paid/cancelled
        paid: isPaid, // Derive from status for backward compatibility
        dueDate: row[16] || "", // Due date from the spreadsheet (column Q)
      };
    });
  } catch (error) {
    console.error("Error getting payments:", error);
    throw error;
  }
}

// Update a payment in Google Sheets
export async function updatePayment(
  paymentId: string,
  payment: {
    amount?: string | number;
    price?: string | number;
    totalRial?: string | number;
    user?: string;
    discordId?: string;
    cardNumber?: string;
    iban?: string;
    nameOnCard?: string;
    phoneNumber?: string;
    paymentDuration?: string;
    game?: string;
    note?: string;
    status?: string;
    timestamp?: string;
    whoPaidCancelled?: string;
    columnToUpdate?: string; // New parameter for specifying a column to update
  }
) {
  try {
    const sheets = await getSheetsClient();

    // First get the current payment data
    const getResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: "Payment!A:Q", // Expanded to include column Q (due date)
    });

    const rows = getResponse.data.values;
    if (!rows) {
      throw new Error("No payments found");
    }

    // Find the row with the matching ID
    let rowIndex = -1;
    let currentPayment = null;

    for (let i = 0; i < rows.length; i++) {
      if (rows[i][0] === paymentId) {
        rowIndex = i + 1; // Sheets rows are 1-indexed
        currentPayment = rows[i];
        break;
      }
    }

    if (rowIndex === -1 || !currentPayment) {
      throw new Error(`Payment with ID ${paymentId} not found`);
    }

    // If only status is being updated, just update that column
    if (payment.status && Object.keys(payment).length <= 3 && (Object.keys(payment).includes('status') || Object.keys(payment).includes('columnToUpdate') || Object.keys(payment).includes('whoPaidCancelled'))) {
      // Update only status column (column O)
      const statusUpdateResponse = await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `Payment!O${rowIndex}`,
        valueInputOption: "USER_ENTERED",
        requestBody: {
          values: [[payment.status]],
        },
      });

      if (statusUpdateResponse.status !== 200) {
        throw new Error("Failed to update payment status");
      }
      
      console.log(`Updated only status column for payment ${paymentId} to ${payment.status}`);
      
      // Return the current payment with updated status
      return {
        ...currentPayment.reduce((obj, val, idx) => {
          const keys = ['id', 'amount', 'price', 'finalAmount', 'user', 'submitDate', 'discordId', 'cardNumber', 'iban', 'nameOnCard', 'phoneNumber', 'paymentDuration', 'game', 'note', 'status', 'whoPaidCancelled'];
          if (idx < keys.length) {
            obj[keys[idx]] = val;
          }
          return obj;
        }, {}),
        status: payment.status,
        paid: payment.status === "Paid",
        timestamp: currentPayment[5], // For backward compatibility
        dueDate: currentPayment[16] || "", // Use the due date from the current payment
      };
    }

    // For full updates, preserve current values for fields not included in the update
    const mergedPayment = {
      id: paymentId,
      amount: payment.amount !== undefined ? payment.amount : currentPayment[1],
      price: payment.price !== undefined ? payment.price : currentPayment[2],
      totalRial:
        payment.totalRial !== undefined ? payment.totalRial : currentPayment[3],
      user: payment.user || currentPayment[4],
      timestamp: currentPayment[5], // Don't update timestamp on edits
      discordId: payment.discordId || currentPayment[6],
      cardNumber: payment.cardNumber || currentPayment[7],
      iban: payment.iban || currentPayment[8],
      nameOnCard: payment.nameOnCard || currentPayment[9],
      phoneNumber: payment.phoneNumber || currentPayment[10],
      paymentDuration: payment.paymentDuration || currentPayment[11],
      game: payment.game || currentPayment[12],
      note: payment.note !== undefined ? payment.note : currentPayment[13],
      status: payment.status || currentPayment[14] || "Pending",
      whoPaidCancelled: payment.whoPaidCancelled || currentPayment[15] || "",
    };

    const row = [
      mergedPayment.id,
      mergedPayment.amount,
      mergedPayment.price,
      mergedPayment.totalRial,
      mergedPayment.user,
      mergedPayment.timestamp,
      mergedPayment.discordId,
      mergedPayment.cardNumber,
      mergedPayment.iban,
      mergedPayment.nameOnCard,
      mergedPayment.phoneNumber,
      mergedPayment.paymentDuration,
      mergedPayment.game,
      mergedPayment.note,
      mergedPayment.status,
      mergedPayment.whoPaidCancelled,
      currentPayment[16] || "", // Preserve due date from current payment
    ];

    // Standard update for all columns
    const updateResponse = await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `Payment!A${rowIndex}:Q${rowIndex}`,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [row],
      },
    });

    if (updateResponse.status !== 200) {
      throw new Error("Failed to update payment");
    }

    // Handle specific column update if requested
    if (payment.columnToUpdate) {
      const columnLetter = payment.columnToUpdate;
      let valueToUpdate = "";
      
      // Determine what value to put in the specified column
      if (columnLetter === 'P') {
        // For column P, use whoPaidCancelled if payment status is updated
        if (payment.status) {
          valueToUpdate = payment.whoPaidCancelled || "";
        }
      }
      
      if (valueToUpdate) {
        const columnUpdateResponse = await sheets.spreadsheets.values.update({
          spreadsheetId: SPREADSHEET_ID,
          range: `Payment!${columnLetter}${rowIndex}`,
          valueInputOption: "USER_ENTERED",
          requestBody: {
            values: [[valueToUpdate]],
          },
        });
        
        if (columnUpdateResponse.status !== 200) {
          console.warn(`Failed to update column ${columnLetter} for payment ${paymentId}`);
        } else {
          console.log(`Successfully updated column ${columnLetter} for payment ${paymentId} with value: ${valueToUpdate}`);
        }
      }
    }

    // Return the updated payment with the due date calculated
    return {
      ...mergedPayment,
      paid: mergedPayment.status === "Paid",
      dueDate: currentPayment[16] || "", // Use the due date from the current payment
    };
  } catch (error) {
    console.error("Error updating payment:", error);
    throw error;
  }
}

// Delete a payment from Google Sheets
export async function deletePayment(paymentId: string) {
  try {
    const sheets = await getSheetsClient();

    const getResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: "Payment!A:A",
    });

    const idColumn = getResponse.data.values;
    if (!idColumn) {
      throw new Error("No payments found");
    }

    let rowIndex = -1;
    for (let i = 0; i < idColumn.length; i++) {
      if (idColumn[i][0] === paymentId) {
        rowIndex = i + 1;
        break;
      }
    }

    if (rowIndex === -1) {
      throw new Error(`Payment with ID ${paymentId} not found`);
    }

    // Update the status to 'Cancelled' instead of using isDeleted flag
    const updateResponse = await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `Payment!O${rowIndex}`,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [["Cancelled"]],
      },
    });

    if (updateResponse.status !== 200) {
      throw new Error("Failed to delete payment");
    }

    return { success: true };
  } catch (error) {
    console.error("Error deleting payment:", error);
    throw error;
  }
}

// Get gold payments from Google Sheets
export async function getGoldPayments() {
  try {
    const sheets = await getSheetsClient();

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: "Gold Payment!A:J", // Range for gold payments (10 columns)
    });

    const rows = response.data.values;

    if (!rows || rows.length === 0) {
      console.log("No data found in the Gold Payment sheet.");
      return [];
    }

    console.log("Raw data from Gold Payment sheet:", rows);

    // Check if the first row is a header or data
    const hasHeaderRow =
      rows.length > 1 &&
      (rows[0][0] === "Date" ||
        (typeof rows[0][0] === "string" &&
          rows[0][0].toLowerCase() === "date"));

    // If there's a header row, skip it with slice(1), otherwise process all rows
    const dataRows = hasHeaderRow ? rows.slice(1) : rows;

    console.log(
      `Processing ${dataRows.length} gold payment data rows (hasHeaderRow: ${hasHeaderRow})`
    );

    return dataRows.map((row, index) => {
      // Ensure the row has enough elements
      if (row.length < 10) {
        while (row.length < 10) {
          row.push("");
        }
      }

      // Map status value from 'Status' column (index 8)
      let status = row[8] || "Pending";
      if (status.toString().trim().toLowerCase() === "yes" ||
          status.toString().trim().toLowerCase() === "true" ||
          status.toString().trim().toLowerCase() === "completed" ||
          status.toString().trim().toLowerCase() === "paid") {
        status = "Paid";
      } else if (status.toString().trim().toLowerCase() === "cancelled" || 
                 status.toString().trim().toLowerCase() === "cancel") {
        status = "Cancelled";
      } else if (status.toString().trim() === "" || 
                 status.toString().trim().toLowerCase() === "pending") {
        status = "Pending";
      }

      return {
        id: row[7] || `gold-${row[1]}-${index}-${new Date().getTime()}`, // Use Payment ID if available or generate one
        date: row[0] || new Date().toISOString(),
        discordId: row[1] || "",
        nameRealm: row[2] || "",
        amount: row[3] || "",
        note: row[4] || "",
        category: row[5] || "",
        admin: row[6] || "",
        paymentId: row[7] || "",
        status: status,
        whoPaid: row[9] || "", // Who Paid field
        paidBy: row[9] || "", // For backward compatibility
      };
    });
  } catch (error) {
    console.error("Error getting gold payments:", error);
    throw error;
  }
}

// Update a gold payment status in Google Sheets
export async function updateGoldPaymentStatus(
  paymentId: string,
  update: {
    status: string;
    paidBy?: string;
    columnToUpdate?: string; // New parameter for specifying a column to update
  }
) {
  try {
    const sheets = await getSheetsClient();

    // Extract the original Discord ID from the payment ID
    // Format of ID is gold-${discordId}-${index}-${timestamp}
    const discordIdMatch = paymentId.match(/gold-([^-]+)-/);
    if (!discordIdMatch || !discordIdMatch[1]) {
      throw new Error(`Invalid gold payment ID format: ${paymentId}`);
    }

    const discordId = discordIdMatch[1];

    // First get all gold payments
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: "Gold Payment!A:J", // Expanded to include column J
    });

    const rows = response.data.values;
    if (!rows) {
      throw new Error("No gold payments found");
    }

    // Find the row with the matching Discord ID
    // Skip header row if it exists
    const startRow = rows[0][0] === "Date" ? 1 : 0;

    // Find all rows matching the Discord ID
    const matchingRows = [];
    for (let i = startRow; i < rows.length; i++) {
      if (rows[i][1] === discordId) {
        matchingRows.push({ rowIndex: i + 1, data: rows[i] });
      }
    }

    if (matchingRows.length === 0) {
      throw new Error(`No gold payments found for Discord ID ${discordId}`);
    }

    // Map status value to sheet format
    let statusValue = "pending";
    if (update.status === "Paid") {
      statusValue = "yes";
    } else if (update.status === "Cancelled") {
      statusValue = "cancelled";
    }

    // Update only the status column (column F) for each matching row
    const updatePromises = matchingRows.map(async ({ rowIndex }) => {
      // Update status (column F)
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `Gold Payment!F${rowIndex}`,
        valueInputOption: "USER_ENTERED",
        requestBody: {
          values: [[statusValue]],
        },
      });
      
      console.log(`Updated only status column for gold payment row ${rowIndex} to ${statusValue}`);
    });

    await Promise.all(updatePromises);

    return {
      success: true,
      message: `Updated status for ${matchingRows.length} gold payment(s) for Discord ID ${discordId}`,
    };
  } catch (error) {
    console.error("Error updating gold payment status:", error);
    throw error;
  }
}
