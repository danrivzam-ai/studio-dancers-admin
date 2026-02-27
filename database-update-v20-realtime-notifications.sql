-- =============================================
-- Studio Dancers - v20: Habilitar Realtime para notificaciones de pagos
-- =============================================

-- Habilitar Realtime en transfer_requests para que el admin reciba
-- notificaciones cuando llega una nueva transferencia o pago con tarjeta
ALTER PUBLICATION supabase_realtime ADD TABLE transfer_requests;
