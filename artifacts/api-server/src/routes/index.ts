import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import jobsRouter from "./jobs";
import walletRouter from "./wallet";
import adminRouter from "./admin";
import messagesRouter from "./messages";
import storageRouter from "./storage";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(jobsRouter);
router.use(walletRouter);
router.use(adminRouter);
router.use(messagesRouter);
router.use(storageRouter);

export default router;
