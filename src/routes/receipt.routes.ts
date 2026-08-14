import { Router } from "express";
import { getReceipt } from "../controllers/receipt.controller";
import { auth } from "../middleware/auth";

const router = Router();

router.get("/:saleId", auth, getReceipt);

export default router;