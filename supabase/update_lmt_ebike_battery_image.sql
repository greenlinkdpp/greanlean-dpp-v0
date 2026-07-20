-- Fix the product image for the 48V 15Ah removable e-bike lithium-ion battery pack.
-- Run this in Supabase SQL Editor after the image asset is deployed.

update public.products
set main_image = '/images/lmt-ebike-battery-48v15ah.png'
where dpp_id = 'DPP-LMT-BAT-48V15AH';

select id, name, name_zh, dpp_id, main_image
from public.products
where dpp_id = 'DPP-LMT-BAT-48V15AH';
