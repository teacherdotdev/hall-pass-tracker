<script lang="ts">
  import { siteUrl } from '#lib/guides.ts';
  import { supportEmail, supportMailto } from '#lib/support.ts';

  const title = 'Privacy · Happy Hallways digital hall pass';
  const description =
    'Happy Hallways keeps your classes and passes in your own browser. No accounts, no cookies, no ads, and only a first name and a few letters of the last.';
</script>

<svelte:head>
  <title>{title}</title>
  <meta name="description" content={description} />
  <link rel="canonical" href="{siteUrl}/privacy" />
  <meta property="og:title" content={title} />
  <meta property="og:description" content={description} />
  <meta property="og:url" content="{siteUrl}/privacy" />
  <meta property="og:image" content="{siteUrl}/og-image.png" />
  <meta name="twitter:card" content="summary_large_image" />
</svelte:head>

<div class="page site-prose">
  <header>
    <p class="eyebrow">Privacy</p>
    <h1>Privacy</h1>
    <p class="muted">What we collect, what we don't, and why.</p>
  </header>

  <section class="card">
    <h2>Your class stays on your computer</h2>
    <p>
      Happy Hallways has no accounts and no sign-in. Your classes, students and passes are stored by your browser on your own
      computer and are never uploaded to us or to anyone else. A backup is a file you download yourself.
    </p>
    <p>
      For each student, Happy Hallways keeps only a first name and the first few letters of the last name, just enough to
      tell students apart. The rest of the last name is thrown away when you paste your class list.
    </p>
    <p>
      If you turn on PINs for a class, each student also has a short PIN to type at the kiosk. Happy Hallways makes these
      up, or you can choose them. Please don't use real student ID numbers.
    </p>
  </section>

  <section class="card">
    <h2>The kiosk by your door</h2>
    <p>
      A paired kiosk talks directly to your computer over an encrypted connection. To find each other, the two devices
      are introduced by a small matchmaking server run by teacher.dev. It sees only a random address for each device,
      stores nothing, and never receives your class or pass data.
    </p>
    <p>
      Some school networks block devices from talking directly. Then the encrypted data is passed along by a relay run
      by <a href="https://developers.cloudflare.com/realtime/turn/" target="_blank" rel="noopener noreferrer">Cloudflare</a>,
      which can't read it.
      Google's public connection service helps each device learn its own network address; it sees no class data.
    </p>
    <p>
      The kiosk keeps a copy of your students' short names (and their PINs, if you use them) and holds passes only until
      your computer receives them. It never shows anyone's PIN on screen.
    </p>
  </section>

  <section class="card">
    <h2>The student link</h2>
    <p>
      If you open the student link, students who have it can see, on their own device, what the kiosk shows the whole
      room: who is out and where they went, who is waiting in line, and whether passes are open, using the same short
      names. Their device connects straight to your computer, the same way the kiosk does, and keeps nothing.
    </p>
    <p>
      Anyone with the link can see it while it's open, so share it only with your class. You can close it at any time,
      or get a new link so the old one stops working. It never shows how long anyone has been out, any PIN, or anything
      you've set for a student.
    </p>
  </section>

  <section class="card">
    <h2>No tracking</h2>
    <p>
      Happy Hallways doesn't use cookies or ads, and we don't share, sell or otherwise transfer any visitor data. To see
      how many people visit, we use
      <a href="https://www.cloudflare.com/web-analytics/" target="_blank" rel="noopener noreferrer"
        >Cloudflare Web Analytics</a
      >, which counts page views without cookies or anything that identifies you, and never sees your class or pass data.
      The fonts load from Google Fonts, which sees a request from your browser like any website would.
    </p>
    <p>
      Questions or concerns? Email <a href={supportMailto('Happy Hallways privacy')}>{supportEmail}</a>.
    </p>
  </section>
</div>

<style>
  .site-prose {
    max-width: 760px;
  }

  .site-prose header {
    display: grid;
    gap: 6px;
  }

  .card p {
    font-size: 15px;
    line-height: 1.6;
  }

  .card a {
    font-weight: 700;
    text-underline-offset: 4px;
  }
</style>
