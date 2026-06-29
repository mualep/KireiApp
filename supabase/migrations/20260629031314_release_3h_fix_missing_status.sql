insert into public.worker_status (user_id, current_status)
select wp.user_id, 'off'
from public.worker_profiles wp
left join public.worker_status ws on wp.user_id = ws.user_id
where ws.user_id is null;
