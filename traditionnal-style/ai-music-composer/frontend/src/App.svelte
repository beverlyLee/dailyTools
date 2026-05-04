<script>
  import { Router, Route, Link } from 'svelte-routing'
  import NavBar from './components/NavBar.svelte'
  import Home from './components/Home.svelte'
  import MusicGenerator from './components/MusicGenerator.svelte'
  import PianoRollEditor from './components/PianoRollEditor.svelte'
  import CompositionLibrary from './components/CompositionLibrary.svelte'
</script>

<Router>
  <div class="app">
    <NavBar />
    <main>
      <Route path="/" component={Home} />
      <Route path="/generate" component={MusicGenerator} />
      <Route path="/editor/:id?" component={PianoRollEditor} />
      <Route path="/library" component={CompositionLibrary} />
      <Route path="/share/:token" let:params>
        <PianoRollEditor shareToken={params.token} />
      </Route>
    </main>
  </div>
</Router>

<style>
  .app {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
  }

  main {
    flex: 1;
    padding: 20px;
  }
</style>
