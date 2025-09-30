"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const photoController_1 = require("../controllers/photoController");
const router = (0, express_1.Router)();
router.get('/image/:id', photoController_1.getPhotoById);
router.get('/gallery/:id', photoController_1.getPhotoGallery);
exports.default = router;
