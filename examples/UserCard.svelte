<script lang="ts">
  import { SECRET_API_KEY } from '$env/static/private';

  let { name, bio } = $props();

  const theme = window.localStorage.getItem('theme') ?? 'light';

  let initials = '';
  $effect(() => {
    initials = name.split(' ').map((p: string) => p[0]).join('');
  });

  function track() {
    fetch('https://api.example.com/track', {
      headers: { authorization: `Bearer ${SECRET_API_KEY}` }
    });
  }
</script>

<div class="card" data-theme={theme} onclick={track}>
  <strong>{initials}</strong>
  <p>{@html bio}</p>
</div>
