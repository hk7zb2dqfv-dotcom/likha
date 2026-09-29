update public.likha_site_config
set cover_url = case
      when cover_url = 'assets/likha-cover.jpg' then 'assets/likha-official-cover.png'
      else cover_url
    end,
    logo_url = case
      when logo_url = 'assets/likha-logo.jpg' then 'assets/likha-logo.png'
      else logo_url
    end
where cover_url = 'assets/likha-cover.jpg'
   or logo_url = 'assets/likha-logo.jpg';
