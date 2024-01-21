require("dotenv").config();
const express = require("express");
const app = express();
const port = 4000;
const { database, ObjectId } = require("./db/mongodb_connection");
const cors = require("cors");

app.use(express.json());
app.use(
  cors({
    origin: "*",
  })
);

app.post("/api/support-agents", async (req, res) => {
  const { name, email, phone, description } = req.body;
  if (!name || !email || !phone || !description) {
    return res
      .status(400)
      .json({ status: 400, error: "Missing required fields" });
  }

  try {
    const agent = (await database).collection("agent");
    const createdAt = new Date();
    const assignedTo = null;
    /* check for email and phone */
    const user = await agent.findOne({ $or: [{ email }, { phone }] });
    if (user) {
      return res
        .status(400)
        .json({ status: 400, error: "User already exists" });
    }
    agent.insertOne({ name, email, phone, description, assignedTo, createdAt });
    return res.status(201).json({ status: 201, message: "Agent created" });
  } catch (err) {
    return res.status(500).json({ status: 500, error: err.message });
  }
});

app.get("/api/support-agents", async (req, res) => {
  try {
    const agent = (await database).collection("agent");
    const agents = await agent.find().toArray();
    return res.status(200).json({ status: 200, data: agents });
  } catch (err) {
    return res.status(500).json({ status: 500, error: err.message });
  }
});

app.post("/api/support-tickets", async (req, res) => {
  const { topic, description, severity, type } = req.body;

  if (!topic || !description || !severity || !type) {
    return res
      .status(400)
      .json({ status: 400, error: "Missing required fields" });
  }

  try {
    const ticket = (await database).collection("ticket");
    const createdAt = new Date();
    const status = "New";
    const resolvedAt = null;
    const assignedTo = null;

    ticket.insertOne({
      topic,
      description,
      severity,
      type,
      status,
      createdAt,
      resolvedAt,
      assignedTo,
    });

    return res.status(201).json({ status: 201, message: "Ticket created" });
  } catch (err) {
    return res.status(500).json({ status: 400, error: err.message });
  }
});

app.put("/api/support-tickets/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const ticket = (await database).collection("ticket");
    const agent = (await database).collection("agent");

    const freeAgent = await agent.findOne({ assignedTo: null });
    if (!freeAgent) {
      return res.status(400).json({ status: 400, error: "No free agents" });
    }

    const assignedTo = freeAgent.name;
    const status = "Assigned";
    await ticket.updateOne(
      { _id: new ObjectId(id) },
      { $set: { assignedTo, status } }
    );
    await agent.updateOne(
      { _id: new ObjectId(freeAgent._id) },
      { $set: { assignedTo: new ObjectId(id) } }
    );
    return res.status(200).json({ status: 200, message: "Ticket assigned" });
  } catch (err) {
    return res.status(500).json({ status: 500, error: err.message });
  }
});

app.put("/api/support-tickets/:id/resolve", async (req, res) => {
  const { id } = req.params;

  try {
    const ticket = (await database).collection("ticket");
    const agent = (await database).collection("agent");

    const resolvedAt = new Date();
    const status = "resolved";
    await ticket.updateOne(
      { _id: new ObjectId(id) },
      { $set: { resolvedAt, status } }
    );
    await agent.updateOne(
      { assignedTo: new ObjectId(id) },
      { $set: { assignedTo: null } }
    );
    return res.status(200).json({ status: 200, message: "Ticket resolved" });
  } catch (err) {
    return res.status(500).json({ status: 500, error: err.message });
  }
});

app.get("/api/support-tickets", async (req, res) => {
  try {
    const { status, assignedTo, severity, type, sort, page, pageSize } =
      req.query;

    // Convert page and pageSize to numbers and set defaults
    const pageNumber = parseInt(page, 10) || 1;
    const pageSizeNumber = parseInt(pageSize, 10) || 10;

    let query = {};
    if (status) query.status = status;
    if (assignedTo) query.assignedTo = assignedTo;
    if (severity) query.severity = severity;
    if (type) query.type = type;

    let sortOptions = {};
    if (sort) {
      const sortOrder = sort.startsWith("-") ? -1 : 1;
      const sortField = sort.startsWith("-") ? sort.substring(1) : sort;
      sortOptions[sortField] = sortOrder;
    }

    const ticket = (await database).collection("ticket");
    const tickets = await ticket
      .find(query)
      .sort(sortOptions)
      .skip((pageNumber - 1) * pageSizeNumber)
      .limit(pageSizeNumber)
      .toArray();

    return res.status(200).json({ status: 200, data: tickets });
  } catch (err) {
    return res.status(500).json({ status: 500, error: err.message });
  }
});

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});
