import { createHmac, timingSafeEqual } from 'node:crypto';
import { BadGatewayException, BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { CreatePaymentResponse, OrderWithItems, VerifyPaymentRequest } from '@restaurantos/types';
import { PrismaService } from '../../database/prisma.service';
import { AppConfigService } from '../../config/app-config.service';
import { OrderService } from '../../order/application/order.service';

const RAZORPAY_CURRENCY = 'INR';

@Injectable()
export class PaymentService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly config: AppConfigService,
    private readonly orderService: OrderService,
  ) {}

  /**
   * Creates a Razorpay order for the diner to pay online. Only allowed once
   * the kitchen has actually served the food — matches where the waiter's
   * cash "Mark paid" option already appears, so both payment paths open at
   * the same point in the order lifecycle.
   */
  async createPayment(orderId: string, tipCents: number): Promise<CreatePaymentResponse> {
    const order = await this.prismaService.prisma.order.findFirst({ where: { id: orderId } });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.status !== 'served') {
      throw new ConflictException('This order can only be paid online once it has been served');
    }

    const amountCents = order.totalCents + tipCents;

    if (!this.config.razorpayConfigured) {
      return {
        configured: false,
        razorpayOrderId: null,
        keyId: null,
        amountCents,
        currency: RAZORPAY_CURRENCY,
      };
    }

    const response = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        Authorization:
          'Basic ' +
          Buffer.from(`${this.config.razorpayKeyId}:${this.config.razorpayKeySecret}`).toString('base64'),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: amountCents,
        currency: RAZORPAY_CURRENCY,
        receipt: orderId,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new BadGatewayException(`Unable to create Razorpay order: ${body}`);
    }

    const razorpayOrder = (await response.json()) as { id: string };

    await this.prismaService.prisma.order.update({
      where: { id: orderId },
      data: { tipCents, razorpayOrderId: razorpayOrder.id },
    });

    return {
      configured: true,
      razorpayOrderId: razorpayOrder.id,
      keyId: this.config.razorpayKeyId ?? null,
      amountCents,
      currency: RAZORPAY_CURRENCY,
    };
  }

  /**
   * Verifies Razorpay's HMAC signature server-side before trusting that a
   * payment actually succeeded — the frontend's word alone is never enough,
   * since a tampered client could otherwise claim any order as paid.
   */
  async verifyPayment(orderId: string, input: VerifyPaymentRequest): Promise<OrderWithItems> {
    const order = await this.prismaService.prisma.order.findFirst({ where: { id: orderId } });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.status === 'paid') {
      return this.orderService.getOrderForCustomer(orderId);
    }

    if (!order.razorpayOrderId || order.razorpayOrderId !== input.razorpayOrderId) {
      throw new BadRequestException('Payment does not match this order');
    }

    if (!this.config.razorpayConfigured) {
      throw new ConflictException('Online payment is not configured');
    }

    const expectedSignature = createHmac('sha256', this.config.razorpayKeySecret!)
      .update(`${input.razorpayOrderId}|${input.razorpayPaymentId}`)
      .digest('hex');

    const provided = Buffer.from(input.razorpaySignature);
    const expected = Buffer.from(expectedSignature);
    const valid = provided.length === expected.length && timingSafeEqual(provided, expected);

    if (!valid) {
      throw new BadRequestException('Payment signature verification failed');
    }

    await this.prismaService.prisma.order.update({
      where: { id: orderId },
      data: { paymentMethod: 'online', razorpayPaymentId: input.razorpayPaymentId },
    });

    return this.orderService.updateStatus(order.tenantId, orderId, 'paid');
  }
}
