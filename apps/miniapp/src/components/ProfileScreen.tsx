import { useReducer } from 'react';
import type { ProfileViewModel } from '../view-model/profile.ts';
import { createProfileUiState, profileUiReducer, visibleProfileServices } from '../view-model/profile.ts';
import { AppViewport, Screen } from './AppShell.tsx';
import { BottomNav } from './BottomNav.tsx';
import { Icon } from './Icon.tsx';

interface ProfileScreenProps {
  model: ProfileViewModel;
  onNavigate?: (id: string) => void;
  onSavedOpen?: () => void;
  onSettings?: () => void;
  onNotifications?: () => void;
}

export function ProfileScreen({ model, onNavigate, onSavedOpen, onSettings, onNotifications }: ProfileScreenProps) {
  const [state, dispatch] = useReducer(profileUiReducer, model, createProfileUiState);
  const designOnly = model.provenance === 'DESIGN_FIXTURE';
  return <AppViewport>
    <a className="skip-link" href="#main">К содержимому</a>
    <Screen className="profile-screen">
      <header className="profile-header">
        <button type="button" className="profile-settings-action" aria-label="Сохранённое" onClick={onSavedOpen} disabled={!onSavedOpen}><Icon name="bookmark" /></button>
        <h1>{model.title}</h1>
        <button type="button" className="profile-settings-action" aria-label="Настройки" onClick={onSettings} disabled={!onSettings}>
          <Icon name="settings" />
        </button>
      </header>

      <button type="button" className="profile-identity-card" aria-label={model.name + ', ' + model.city} onClick={onSettings} disabled={!onSettings}>
        {model.avatar ? <img src={model.avatar} alt={model.avatarAlt} /> : <span className="profile-avatar-initial" aria-hidden="true">{model.name.slice(0,1)}</span>}
        <span className="profile-identity-copy"><strong>{model.name}</strong><span>{model.city}</span></span>
        <Icon name="chevronRight" />
      </button>

      {model.preferenceSections.map(section => {
        const editing = state.editingSection === section.id;
        const selected = state.selectedChipIds[section.id];
        return <section className={'profile-preference-section' + (editing ? ' is-editing' : '')} aria-labelledby={'profile-' + section.id} key={section.id}>
          <div className="profile-section-heading">
            <h2 id={'profile-' + section.id}>{section.title}</h2>
            <button type="button" disabled={!designOnly&&!onSettings} aria-expanded={editing} onClick={() => designOnly ? dispatch({ type: 'TOGGLE_EDIT', sectionId: section.id }) : onSettings?.()}>
              {editing ? 'Готово' : 'Изменить'}
            </button>
          </div>
          <div className="profile-chip-list">
            {section.chips.map(chip => <button
              type="button"
              className={'profile-chip' + (selected.includes(chip.id) ? ' is-selected' : '')}
              key={chip.id}
              aria-pressed={selected.includes(chip.id)}
              disabled={!designOnly || !editing}
              onClick={() => dispatch({ type: 'TOGGLE_CHIP', sectionId: section.id, chipId: chip.id })}
            >{chip.label}</button>)}
            <button type="button" className="profile-chip profile-chip-add" aria-label={'Добавить: ' + section.title} disabled>
              <Icon name="plus" />
            </button>
          </div>
        </section>;
      })}

      <section className="profile-preference-rows" aria-label="Предпочтения для подбора событий">
        {model.preferenceRows.map(row => <button
          type="button"
          className={'profile-preference-row profile-preference-row-' + row.id}
          key={row.id}
          onClick={designOnly ? row.id === 'notifications' ? () => dispatch({ type: 'TOGGLE_NOTIFICATIONS' }) : undefined : row.id === 'notifications' ? onNotifications : onSettings}
          disabled={designOnly ? row.id !== 'notifications' : !(row.id === 'notifications' ? onNotifications : onSettings)}
        >
          <Icon name={row.icon} />
          <span><strong>{row.label}</strong><small>{row.id === 'notifications' && !state.notificationsEnabled ? 'Выключены' : row.value}</small></span>
          <Icon name="chevronRight" />
        </button>)}
      </section>

      <section className="profile-contact-section" aria-labelledby="profile-contact-heading">
        <div className="profile-section-heading">
          <h2 id="profile-contact-heading">Связанные сервисы</h2>
          <button type="button" disabled>Изменить</button>
        </div>
        <div className="profile-contact-list">
          {visibleProfileServices(model).map(contact => <button type="button" className={'profile-contact profile-contact-' + contact.id} key={contact.id} aria-label={contact.label + (designOnly ? ': дизайн-пример, подключение недоступно' : ': подключён')} disabled>
            {contact.id === 'vk' ? <span aria-hidden="true">VK</span> : <Icon name="ok" />}
          </button>)}
          {designOnly && <button type="button" className="profile-contact profile-contact-add" aria-label="Добавление внешнего аккаунта недоступно" disabled><Icon name="plus" /></button>}
        </div>
      </section>

      <button type="button" className="profile-settings-row" onClick={onSettings} disabled={!onSettings}>
        <Icon name="settings" /><span>Настройки</span><Icon name="chevronRight" />
      </button>
    </Screen>
    <BottomNav active="profile" onSelect={onNavigate} />
  </AppViewport>;
}
